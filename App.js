import React from 'react';
import { FlatList, StyleSheet, Text, View, Button } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import WifiManager from "react-native-wifi-reborn";
//import { useState } from 'react/cjs/react.production.min';
import { useState, useRef, useEffect } from 'react';

const styles = StyleSheet.create({
  container: {
   flex: 1,
   paddingTop: 22
  },
  item: {
    padding: 10,
    fontSize: 18,
    height: 44,
  },
  location: {
    fontSize: 12, 
    justifyContent: 'center'
  },
  title: {
    fontSize: 18,
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  isHere: {
    fontSize: 24,
    justifyContent: 'center',
    textDecorationLine: 'underline',
    color: 'red',
  },
  inThreshold: {
    padding: 10,
    fontSize: 18,
    height: 44,
    fontWeight: 'bold',
    color: 'red',
  },

});



// TODO: 
// Add conditional rendering for a "You're here" component
// Add function to calc threshold ranges for current location
// Add button / function to set state of current place

const WifiList = () => {

  // Use this to initialize the two networkList states
  blankNetworkList = [{'SSID': 'LOADING...', 'level': "",}]
  
  const [networkList, setNetworkList] = useState(blankNetworkList);
  // This is a janky fix -- https://upmostly.com/tutorials/settimeout-in-react-components-using-hooks
  // Doing this so we can reference the current state inside the core loop
  const networkRef = useRef(networkList);
  networkRef.current = networkList;


  //Sometimes the getWifiList() promises seem to get backed up -- using this to see how many loops we're running
  const [count, setCount] = useState(0);
  const countRef = useRef(count);
  countRef.current = count;
    

  
  const [currentMarker, setMarker] = useState({
    'id': '',
    'networkList': blankNetworkList,
    thresholdDict: {},
    isHere: false,
  });
  const markerRef = useRef(currentMarker);
  markerRef.current = currentMarker;

  // Using this for UI / debugging purposes 
  // keeping track of which wifi networks are within threshold and contributing to "HERE" result
  const [inThresholdArray, setInThresholdArray] = useState([]);
  const inThresholdRef = useRef(inThresholdArray);
  inThresholdRef.current = inThresholdArray;

  // The actual wifi request -- runs asyncronously
  const getWifiList = async () => {
    
    // The count state gets updated each loop, to help with debugging
    console.log("Count: " + parseInt(countRef.current));
    setCount( parseInt(countRef.current) + 1 );
    
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location permission is required for WiFi connections',
        message:
          'This app needs location permission as this is required  ' +
          'to scan for wifi networks.',
        buttonNegative: 'DENY',
        buttonPositive: 'ALLOW',
      },
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      // You can now use react-native-wifi-reborn
      
      WifiManager.reScanAndLoadWifiList().then(
        (wifiData) => {
          setNetworkList(wifiData);
        },
        (error) => 
        console.log("Error getting wifi", error)
      )
    } else {
      // Permission denied
      console.log("Permission Denied")
    }
    return;
  }

  const createMarker = (networkList) => {
    setMarker({
      'id': Date.now(),
      'networkList': networkList,
      'thresholdDict': createMarkerThresholds(networkList),
      'isHere': true,
    });
    return
  }

  const createMarkerThresholds = (markerNetworkList) => {
    // This controls how wide the thresholds are 
    // TODO: Work on tuning -- potentially some analysis is required to find the right value 
    // Possibly a more advanced approach could be implemented (a range that varies more dramatically based on strength value)
    const sensitivityWeight = 0.03;    
    let thresholdDict = {};

    markerNetworkList.map( (networkDict) => {
      thresholdDict[ networkDict.SSID ] = {
        // These are logically flipped because the value will be negative
        'min': networkDict.level * (1 + sensitivityWeight),
        'max': networkDict.level * (1 - sensitivityWeight)
      }
    });
    return thresholdDict;
  }

  // The function that determines whether we're in the same location as the marker
  // Compare the thresholdDict from the currentMarker state to the networkList state
  // Returns an array of two items:
  // 0. Boolean indicating whether current location == marker location
  // 1. Array of which networks returned within threshold values to result in 0th element
  const checkThresholds = (networkList, thresholdDict) => {
    let inThresholdArray = [];

    checkList = networkList.map( (networkDict, idx) => {
      // We need to handle networks that aren't in the threshold list
      if ( !(Object.keys(thresholdDict).includes( networkDict.SSID )) ) {
        return false;
      } else {
        const inThreshold = (thresholdDict[ networkDict.SSID ].min <= networkDict.level) && (thresholdDict[ networkDict.SSID ].max >= networkDict.level);
        if (inThreshold) {
          inThresholdArray.push(networkDict.SSID);
        }
        return inThreshold;
      }
    });
    numTrues = checkList.filter(x => x == true).length;
    return [(numTrues >= 4), inThresholdArray];
  }


  const coreLoop = () => {
    getWifiList();
    let isHere = false;
    
    // Now that we're in the coreLoop, which is called by setInterval, we need to use the state references
    if (Object.keys(markerRef.current.thresholdDict).length > 0) {
      let tempArray = checkThresholds(networkRef.current, markerRef.current.thresholdDict);
      isHere = tempArray[0];
      setInThresholdArray(tempArray[1]);
    }

    setMarker({
      ...markerRef.current,
      'isHere': isHere,
    });  

    return;
  }

  const nlToString = (networkList) => {
    let txtList = [];
    
    for( let i = 0; i < networkList.length; i ++ ) {
      txtList.push(
        networkList[i].SSID + " - " + networkList[i].level
      );
    }

    const txt = txtList.join("; ");

    return txt;
  }

  // When the component mounts start the core loop running on an interval
  // Todo: identify ideal value for interval -- or portentially a more robust method??? 
  useEffect(() => {
    const interval = setInterval(() => {
      coreLoop();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text
        style={styles.title}
      >
        Marked Location:
      </Text>
      <Text style={styles.location}>{ nlToString(currentMarker.networkList) }</Text>
      <Text
        style={styles.title}
      >
        Current Location:
      </Text>
      <FlatList
        data={ networkList }
        renderItem={({item}) => <Text style={inThresholdArray.includes(item.SSID) ? styles.inThreshold : styles.item}>{item["SSID"]}: {item.level}</Text>}
      />
      { currentMarker.isHere && 
        <Text style={styles.isHere}>YOU ARE HERE</Text>
      }
      <Button
        onPress={() => createMarker(networkList)}
        title="Set Marker Here"
        accessibilityLabel="Set Marker Here"
      />
      <Button
        onPress={() => getWifiList()}
        title="Refresh List"
        accessibilityLabel="Refresh the Wifi List"
      />
    </View>
  );
}

export default WifiList;