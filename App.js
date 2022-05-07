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
});





const WifiList = () => {
  const [networkList, setNetworkList] = useState([{'SSID': 'test', 'level': 1}]);
  
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
    return
  }

  //getWifiList();

  return (
    <View style={styles.container}>
      <FlatList
        data={ networkList }
        renderItem={({item}) => <Text style={styles.item}>{item["SSID"]}: {item.level}</Text>}
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