/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Fragment} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  StatusBar,
  Image,
  Button
} from 'react-native';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';
import * as tf from '@tensorflow/tfjs';
import { fetch } from '@tensorflow/tfjs-react-native';
import * as jpeg from 'jpeg-js';
import * as nsfwjs from 'nsfwjs';
import ImagePicker from 'react-native-image-picker';

export default class App extends React.Component {
  state = {
    tfReady: false,
    modelReady: false,
    predictions: null,
    image: null
  };

  async componentDidMount() {
    // Wait for tf to be ready.
    await tf.ready();
    // Signal to the app that tensorflow.js can now be used.
    this.setState({tfReady: true});
    this.model = await nsfwjs.load();
    this.setState({modelReady: true});
  }

  imageToTensor(rawImageData: ArrayBuffer): tf.Tensor3D {
    const TO_UINT8ARRAY = true;
    const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY);
    // Drop the alpha channel info for mobilenet
    const buffer = new Uint8Array(width * height * 3);
    let offset = 0; // offset into original data
    for (let i = 0; i < buffer.length; i += 3) {
      buffer[i] = data[offset];
      buffer[i + 1] = data[offset + 1];
      buffer[i + 2] = data[offset + 2];

      offset += 4;
    }

    return tf.tensor3d(buffer, [height, width, 3]);
  }

  classifyImage = async () => {
    const imageAssetPath = Image.resolveAssetSource(this.state.image);
    const response = await fetch(imageAssetPath.uri, {}, { isBinary: true });
    const rawImageData = await response.arrayBuffer();
    const imageTensor = this.imageToTensor(rawImageData);
    const predictions = await this.model.classify(imageTensor);
    this.setState({predictions});
  }

  selectImage = () => {
    const options = {
      title: 'Select Image',
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
    };
    ImagePicker.showImagePicker(options, (response) => {
      console.log('Response = ', response);
    
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else if (response.customButton) {
        console.log('User tapped custom button: ', response.customButton);
      } else {
        const source = { uri: response.uri };
    
        // You can also display the image using data:
        // const source = { uri: 'data:image/jpeg;base64,' + response.data };
    
        this.setState({
          image: source,
          predictions: null
        });
        this.classifyImage()
      }
    });
  }

  renderPrediction = (prediction) => {
    return (
      <Text key={prediction.className}>{prediction.className}: {Math.round(prediction.probability * 100)}%</Text>
    )
  }

  render () {
    const { tfReady, modelReady, predictions, image } = this.state
    return (
      <Fragment>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView>
          <View style={styles.root}>
            <View style={styles.body}>
              <Text>TFJS: {tfReady ? "Ready" : "Loading"}</Text>
              {tfReady && <Text>Model: {modelReady ? "Loaded" : "Loading"}</Text>}
              {modelReady && <Button onPress={this.selectImage} title="Choose Image" />}
              {image && <Image source={image} style={styles.image} />}
              {modelReady && image && <Text>Predictions: {predictions ? "" : "Predicting"}</Text>}
              {modelReady && predictions && predictions.map((p) => this.renderPrediction(p))}
            </View>
          </View>
        </SafeAreaView>
      </Fragment>
    );
  }
};

const styles = StyleSheet.create({
  root: {
    height: "100%",
    backgroundColor: Colors.lighter,
  },
  body: {
    flex: 1,
    backgroundColor: Colors.white,
    flexDirection: 'column',
    justifyContent: "center",
    alignItems: "center"
  },
  image: {
    width: 250,
    height: 250
  }
});
