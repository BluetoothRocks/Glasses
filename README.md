# BluetoothRocks! Glasses
Visualize audio or display a text on a pair of CHEMION connected glasses using WebBluetooth


## What do you need?

A browser that support WebBluetooth and a pair of [CHEMION glasses](https://www.chemionglasses.com).


## How does this work?

The browser can connect to a Bluetooth LE device like the heart rate monitor using the WebBluetooth API. Each Bluetooth device has a number of services and characteristics. Think of them like objects with properties. Once connected to the device, the API then exposes these services and characteristics and you can read from and write to those characteristics. 

The CHEMION glasses allow you to send picture data which are displayed using LED's build in the glasses. The audio visualization uses getUserMedia() to access the microphone of the computer and the WebAudio API to analyze the frequencies of the audio. It then draws a graph and sends that over to the glasses a number of times per second. The text visualization works by drawing text on a virtual canvas and sending that data over to the glasses.


## Why??

What do you mean? Because it's fun, of course!