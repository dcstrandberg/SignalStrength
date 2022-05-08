import React from 'react';
import { FlatList, StyleSheet, Text, View, Button } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import WifiManager from "react-native-wifi-reborn";
//import { useState } from 'react/cjs/react.production.min';
import { useState } from 'react';


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
  }
});



// TODO: 
// Add conditional rendering for a "You're here" component
// Add function to calc threshold ranges for current location
// Add button / function to set state of current place

const WifiList = () => {

  blankNetworkList = [{'SSID': 'LOADING...', 'level': ""}]
  const [networkList, setNetworkList] = useState(blankNetworkList);
  const [currentMarker, setMarker] = useState(blankNetworkList);
  
  const getWifiList = async () => {
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
    setMarker(networkList);
    //return createMarkerThresholds(networkList);
    return;
  }

  const createMarkerThresholds = (currentMarker) => {
    sensitivityWeight = 0.1
    thresholdDict = currentMarker.map( (networkDict) => {
      thresholdDict[ networkDict.SSID ] = {
        // These are logically flipped because the value will be negative
        'min': networkDict.level * (1 + sensitivityWeight),
        'max': networkDict.level * (1 - sensitivityWeight)
      }
    });
    return thresholdDict;
  }

  const checkThresholds = (networkList, thresholdDict) => {
    checkList = networkList.map( (networkDict) => {
      (thresholdDict[ networkDict.SSID ].min <= networkDict.level && thresholdDict[ networkDict.SSID ].max >= networkDict.level);
    });
    numTrues = checkList.reduce((partialSum, a) => partialSum + a, 0);
    return (numTrues == checkList.length);
  }


  const coreLoop = () => {
    getWifiList();
    //checkThresholds(networkList, thresholdDict);
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
  //getWifiList();

  setTimeout(coreLoop, 5000);

  return (
    <View style={styles.container}>
      <Text
        style={styles.title}
      >
        Marked Location:
      </Text>
      <Text style={styles.location}>{ nlToString(currentMarker) }</Text>
      <Text
        style={styles.title}
      >
        Current Location:
      </Text>
      <FlatList
        data={ networkList }
        renderItem={({item}) => <Text style={styles.item}>{item["SSID"]}: {item.level}</Text>}
      />
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