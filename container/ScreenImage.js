import React, { Component } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Animated, Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  PanResponder,
  Dimensions,
} from 'react-native';
import PropTypes from 'prop-types';

const { width, height } = Dimensions.get('window');
const Metrics = {
  screenWidth: width,
  screenHeight: height,
};

const ANIM_CONFIG = { duration: 200 };


class ImageShare extends Component {

  constructor(props) {
    super(props);
    this.state = ({
      refreshing: false,
      index: 0,
      origin: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      target: {
        x: 0,
        y: 0,
        opacity: 1,
      },
      fullscreen: false,
      animating: false,
      panning: false,
      selectedImageHidden: false,
      slidesDown: false,
    });

    this.openAnim = new Animated.Value(0);
    this.pan = new Animated.Value(0);
    this.carouselItems = {};
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => !this.state.animating,
      onStartShouldSetPanResponderCapture: () => !this.state.animating,
      onMoveShouldSetPanResponder: () => !this.state.animating,
      onMoveShouldSetPanResponderCapture: () => !this.state.animating,
      onPanResponderTerminationRequest: () => true,
      onPanResponderMove: (evt, gestureState) => {
        this.pan.setValue(gestureState.dy);

        if (Math.abs(gestureState.dy) > 15 && !this.state.panning) {
          this.pan.setValue(0);
          this.setState({ panning: true });
        }
      },
      onPanResponderRelease: this.handlePanEnd,
      onPanResponderTerminate: this.handlePanEnd,
    });
  }

  animateOpenAnimToValue = (toValue, onComplete) => (
    Animated.timing(this.openAnim, {
      ...ANIM_CONFIG,
      toValue,
    }).start(() => {
      this.setState({ animating: false });
      if (onComplete) {
        onComplete();
      }
    })
  )
  open = (index) => () => {
    const activeComponent = this.carouselItems[index];
    activeComponent.measure((rx, ry, width, height, x, y) => {
      this.setState(
        {
          fullscreen: true,
          animating: true,
          origin: { x, y, width, height },
          target: { x: 0, y: 0, opacity: 1 },
          index: index - 1,
        },
        () => {
          this.animateOpenAnimToValue(1);
        }
      );
    });
  }

  close = () => {
    this.setState({ animating: true });
    this.carouselItems[this.state.index + 1].measure((rx, ry, width, height, x, y) => {
      this.setState({
        origin: { x, y, width, height },
        slidesDown: x + width < 0 || x > Metrics.screenWidth,
      });

      this.animateOpenAnimToValue(0, () => {
        this.setState({
          fullscreen: false,
          selectedImageHidden: false,
          slidesDown: false,
        });
      });
    });
  }

  handlePanEnd = (evt, gestureState) => {
    if (Math.abs(gestureState.dy) > 50) {
      this.setState({
        panning: false,
        target: {
          x: gestureState.dx,
          y: gestureState.dy,
          opacity: 1 - Math.abs(gestureState.dy / Metrics.screenHeight),
        },
      });
      this.close();
    } else {
      Animated.timing(this.pan, {
        toValue: 0,
        ...ANIM_CONFIG,
      }).start(() => this.setState({ panning: false }));
    }
  }

  getFullscreenOpacity = () => {
    const { panning, target } = this.state;

    return {
      opacity: panning
        ? this.pan.interpolate({
          inputRange: [-Metrics.screenHeight, 0, Metrics.screenHeight],
          outputRange: [0, 1, 0],
        })
        : this.openAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, target.opacity],
        }),
    };
  };

  captureCarouselItem = (ref, idx) => {
    this.carouselItems[idx] = ref;
  }

  handleModalShow = () => {
    const { animating, selectedImageHidden } = this.state;

    if (!selectedImageHidden && animating) {
      this.setState({ selectedImageHidden: true });
    }
  }

  getSwipeableStyle = () => {
    const { fullscreen, origin, slidesDown, target } = this.state;

    if (!fullscreen) {
      return { flex: 1 };
    }

    const inputRange = [0, 1];

    return !slidesDown
      ? {
        left: this.openAnim.interpolate({
          inputRange,
          outputRange: [origin.x, target.x],
        }),
        top: this.openAnim.interpolate({
          inputRange,
          outputRange: [origin.y, target.y],
        }),
        width: this.openAnim.interpolate({
          inputRange,
          outputRange: [origin.width, Metrics.screenWidth],
        }),
        height: this.openAnim.interpolate({
          inputRange,
          outputRange: [origin.height, Metrics.screenHeight],
        }),
      }
      : {
        left: 0,
        right: 0,
        height: Metrics.screenHeight,
        top: this.openAnim.interpolate({
          inputRange,
          outputRange: [Metrics.screenHeight, target.y],
        }),
      };
  };


  renderDefaultHeader = () => (
    <TouchableWithoutFeedback onPress={this.close}>
      <View>
        <Text
          style={{
            color: 'white',
            textAlign: 'right',
            padding: 10,
            margin: 30,
          }}>Close</Text>
      </View>
    </TouchableWithoutFeedback>
  )



  renderFullscreenContent = (url, index) => () => {
    const { panning } = this.state;
    const containerStyle = [
      this.getSwipeableStyle(),
      panning && { top: this.pan },
    ];
    return (
      <Animated.View style={containerStyle} key={index}>
        <ScrollView
          ref={ref => {
            if (ref) {
              ref.scrollResponderHandleStartShouldSetResponder = () => true;
            }
          }}
          contentContainerStyle={{ flex: 1 }}
          maximumZoomScale={2}
          alwaysBounceVertical={false}
        >
          <View
            style={{ flex: 1 }}
            {...this.panResponder.panHandlers}
          >
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Image
                source={{ uri: url }}
                style={[{
                  flex: 1,
                }, { resizeMode: 'contain' }]}
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    );
  }

  renderFullscreen = () => {
    const { fullscreen } = this.state;
    const { urlImage } = this.props;
    const opacity = this.getFullscreenOpacity();

    return (
      <Modal
        transparent
        visible={fullscreen}
        onShow={this.handleModalShow}
        onRequestClose={this.close}
      >
        <Animated.View
          style={[{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'black',
          }, opacity]} />
        {
          this.renderFullscreenContent(urlImage, 0)()
        }
        <Animated.View
          style={[opacity, {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }]}>
          {this.renderDefaultHeader()}
        </Animated.View>
      </Modal>
    );
  }


  render() {
    const { fullscreen, selectedImageHidden } = this.state;
    const { urlImage, styles } = this.props;
    const indexState = this.state.index;

    const getOpacity = () => ({
      opacity: selectedImageHidden ? 0 : 1,
    });
    return (
      <React.Fragment>
        <View >
          <TouchableWithoutFeedback
            onPress={this.open(1)}
          >
            <View style={[{ width: 100, height: 100 }, indexState === 0 && getOpacity()]}>
              <Image
                ref={ref => this.captureCarouselItem(ref, 1)}
                style={[{ width: 100, height: 100 }, styles]}
                source={{ uri: urlImage }} />
            </View>
          </TouchableWithoutFeedback>


        </View>
        {fullscreen && this.renderFullscreen()}
      </React.Fragment>
    );
  }
}

ImageShare.propTypes = {
  urlImage: PropTypes.string,
  styles: PropTypes.object,
};

export default ImageShare;