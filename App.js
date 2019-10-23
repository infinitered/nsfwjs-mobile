import React, {Fragment} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  StatusBar,
  Image,
  Button,
  TouchableOpacity,
  Linking,
  ScrollView
} from 'react-native';
import * as tf from '@tensorflow/tfjs';
import { fetch } from '@tensorflow/tfjs-react-native';
import * as jpeg from 'jpeg-js';
import * as nsfwjs from 'nsfwjs';
import ImagePicker from 'react-native-image-picker';
import { BlurView } from "@react-native-community/blur";
import { bundleResourceIO } from "@tensorflow/tfjs-react-native";

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
    this.model = await nsfwjs.load(bundleResourceIO(require("./nsfw-model.json"), require("./nsfw-weights.bin")));
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
      <Text key={prediction.className} style={styles.text}>{prediction.className}: {Math.round(prediction.probability * 100)}%</Text>
    )
  }

  render () {
    const { tfReady, modelReady, predictions, image } = this.state
    let shouldBlur = true;
    if (predictions) {
      switch(predictions[0].className) {
        case 'Porn':
        case 'Sexy':
        case 'Hentai':
          shouldBlur = true;
          break;
        default:
          shouldBlur = false;
      }
    }
    return (
      <Fragment>
        <StatusBar barStyle="light-content" />
        <SafeAreaView backgroundColor="#000000">
          <ScrollView style={styles.root} contentContainerStyle={styles.rootContent}>
            <View style={styles.body}>
              <Image source={require("./nsfwjs_logo.jpg")} style={styles.logo} />
              <Text style={styles.text}>TFJS: {tfReady ? "Ready" : "Loading"}</Text>
              {tfReady && <Text style={styles.text}>Model: {modelReady ? "Loaded" : "Loading"}</Text>}
              <TouchableOpacity style={styles.imageWrapper} onPress={modelReady ? this.selectImage : undefined}>
                {image && <Image source={image} style={styles.image} />}
                {image && shouldBlur && <BlurView blurType="dark" blurAmount={30} style={styles.blur} />}
                {modelReady && !image && <Text style={styles.transparentText}>Tap to choose image</Text>}
              </TouchableOpacity>
              <View style={styles.predictionWrapper}>
                {modelReady && image && <Text style={styles.text}>Predictions: {predictions ? "" : "Predicting"}</Text>}
                {modelReady && predictions && predictions.map((p) => this.renderPrediction(p))}
              </View>
              <View style={styles.footer}>
                <View style={styles.logoWrapper}>
                  <TouchableOpacity onPress={() => Linking.open("https://js.tensorflow.org/")} style={styles.logoLink}>
                    <Text style={styles.poweredBy}>Powered by:</Text>
                    <Image source={require("./tfjs.jpg")} style={styles.tfLogo} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Linking.open("https://infinite.red")} style={styles.logoLink}>
                    <Text style={styles.presentedBy}>Presented by:</Text>
                    <Image source={require("./ir-logo.png")} style={styles.irLogo} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.resources}>Resources:</Text>
                <View style={styles.links}>
                  <Text onPress={() => Linking.open("https://github.com/infinitered/nsfwjs-mobile/")} style={styles.text}>GitHub</Text>
                  <Text onPress={() => Linking.open("https://github.com/infinitered/nsfwjs")} style={styles.text}>NSFWJS GitHub</Text>
                  <Text onPress={() => Linking.open("https://shift.infinite.red/avoid-nightmares-nsfw-js-ab7b176978b1")} style={styles.text}>Blog Post</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Fragment>
    );
  }
};

const styles = StyleSheet.create({
  root: {
    width: "100%",
    height: "100%"
  },
  rootContent: {
    width: "100%",
    height: "100%",
    backgroundColor: '#000000',
    marginBottom: 50
  },
  body: {
    flex: 1,
    backgroundColor: '#000000',
    flexDirection: 'column',
    alignItems: "center",
    color: '#ffffff'
  },
  text: {
    color: '#ffffff'
  },
  logo: {
    width: 300,
    height: 120
  },
  imageWrapper: {
    width: 280,
    height: 280,
    padding: 10,
    borderColor: '#02bbd7',
    borderWidth: 5,
    borderStyle: "dashed",
    marginTop: 10,
    marginBottom: 10,
    position: 'relative',
    justifyContent: "center",
    alignItems: "center"
  },
  image: {
    width: 250,
    height: 250,
    position: 'absolute',
    top: 10,
    left: 10,
    bottom: 10,
    right: 10,
  },
  blur: {
    width: 250,
    height: 250,
    position: 'absolute',
    top: 10,
    left: 10, 
    bottom: 10,
    right: 10
  },
  transparentText: {
    color: "#ffffff",
    opacity: 0.7
  },
  predictionWrapper: {
    height: 100,
    width: "100%",
    flexDirection: "column",
    alignItems: "center"
  },
  footer: {
    flexDirection: "column",
    alignItems: "center"
  },
  logoWrapper: {
    flexDirection: "row",
    justifyContent: "space-around"
  },
  logoLink: {
    flexDirection: "column",
    alignItems: "center",
    flex: 1
  },
  poweredBy: {
    fontSize: 20,
    color: "#e69e34",
    marginBottom: 6
  },
  tfLogo: {
    width: 125,
    height: 70,
  },
  presentedBy: {
    fontSize: 20,
    color: "#e72f36",
    marginBottom: 8
  },
  irLogo: {
    width: 150,
    height: 64
  },
  resources: {
    marginTop: 10,
    color: "#ffffff"
  },
  links: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 10,
    marginBottom: 25
  }
});
