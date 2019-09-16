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
  ScrollView,
  View,
  Text,
  StatusBar,
} from 'react-native';

import {
  Header,
  LearnMoreLinks,
  Colors,
  DebugInstructions,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

const doLinearPrediction = async () => {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      units: 1,
      inputShape: [1]
    })
  );

  model.compile({
    optimizer: "sgd",
    loss: "meanSquaredError"
  });

  const xs = tf.tensor([-1, 0, 1, 2, 3, 4]);
  const ys = tf.tensor([-3, -1, 1, 3, 5, 7]);

  console.log("starting fit");
  await model.fit(xs, ys, { epochs: 500 });

  console.log("done");
  const next = tf.tensor([10]);

  const answer = model.predict(next);
  tf.print(answer);
  const numericAnswer = await answer.data();
  return await Math.round(numericAnswer);
};

export default class App extends React.Component {
  state = {
    simplePredict: "working",
    isTfReady: false
  };

  async componentDidMount() {
    // Wait for tf to be ready.
    await tf.ready();
    // Signal to the app that tensorflow.js can now be used.
    this.setState({
      isTfReady: true,
    });
    doLinearPrediction().then(result =>
      this.setState({ simplePredict: result })
    );
  }

  render () {
    return (
      <Fragment>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView>
          <View style={styles.root}>
            <View style={styles.body}>
              <Text>TFJS: {this.state.isTfReady ? "Ready" : "Not Ready"}</Text>
              <Text>{this.state.simplePredict}</Text>
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
});
