import React from 'react'
import { View, ScrollView, Animated, PanResponder, UIManager, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import Animation from 'lottie-react-native';

class AnimatedPullToRefresh extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      scrollY : new Animated.Value(0),
      refreshHeight: new Animated.Value(0),
      isScrollFree: false,
    }

    UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  static propTypes = {
    /**
     * Refresh state set by parent to trigger refresh
     * @type {Boolean}
     */
    isRefreshing : PropTypes.bool.isRequired,
    /**
     * Pull Distance
     * @type {Integer}
     */
    pullHeight : PropTypes.number,
    /**
     * Callback after refresh event
     * @type {Function}
     */
    onRefresh : PropTypes.func.isRequired,
    /**
     * The content: ScrollView or ListView
     * @type {Object}
     */
    contentView: PropTypes.object.isRequired,
    /**
     * Background color
     * @type {string}
     */
    animationBackgroundColor: PropTypes.string,
    /**
     * Custom onScroll event
     * @type {Function}
     */
    onScroll: PropTypes.func,
    /**
     * Custom styling for loader
     * @type {Object}
     */
    animationStyle: PropTypes.shape({}),
  }

  static defaultProps = {
    pullHeight : 20,
    animationHeight: 140,
    animationBackgroundColor: 'white'
  }

  componentWillMount() {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: this._handleStartShouldSetPanResponder.bind(this),
      onMoveShouldSetPanResponder: this._handleMoveShouldSetPanResponder.bind(this),
      onShouldBlockNativeResponder: () => false,
      onPanResponderMove: this._handlePanResponderMove.bind(this),
      onPanResponderRelease: this._handlePanResponderEnd.bind(this),
      onPanResponderTerminate: this._handlePanResponderEnd.bind(this),
    });
  }

  componentWillReceiveProps(nextProps) {
    const hasRefreshingChanged = nextProps.isRefreshing !== this.props.isRefreshing;

    if (nextProps.isRefreshing && hasRefreshingChanged) {
      this.loadingAnimation.play();
      Animated.spring(this.state.refreshHeight, {
        toValue: -this.props.animationHeight
      }).start();
    }

    if (!nextProps.isRefreshing && hasRefreshingChanged) {
      this.loadingAnimation.reset();
      Animated.spring(this.state.refreshHeight, {
        toValue: 0
      }).start();
    }
  }

  _handleStartShouldSetPanResponder(e, gestureState) {
    return !this.state.isScrollFree;
  }

  _handleMoveShouldSetPanResponder(e, gestureState) {
    const { dx, dy } = gestureState;

    return !this.state.isScrollFree && dx > 2 || dx < -2 || dy > 2 || dy < -2
  }

  //if the content scroll value is at 0, we allow for a pull to refresh
  _handlePanResponderMove(e, gestureState) {
    if(!this.props.isRefreshing) {
      if((gestureState.dy >= 0 && this.state.scrollY._value === 0) || this.state.refreshHeight._value > 0) {
        this.state.refreshHeight.setValue(-1 * gestureState.dy * 0.5);
      } else {
        // Native android scrolling
        this.refs.scrollComponentRef.scrollTo({ y: -1 * gestureState.dy, animated: true });
      }
    }
  }

  _handlePanResponderEnd(e, gestureState) {
    if(!this.props.isRefreshing) {
      if(this.state.refreshHeight._value <= -this.props.pullHeight) {
        this.onScrollRelease();
      } else if(this.state.refreshHeight._value <= 0) {
        Animated.spring(this.state.refreshHeight, {
          toValue: 0
        }).start();
      }

      if(this.state.scrollY._value > 0) {
        this.setState({isScrollFree: true});
      }
    }
  }

  onScrollRelease() {
    if(!this.props.isRefreshing) {
      this.props.onRefresh();
    }
  }

  onScrollEvent = (event) => {
  this.state.scrollY.setValue(event.nativeEvent.contentOffset.y)
};

  isScrolledToTop = () => {
    if(this.state.scrollY._value === 0 && this.state.isScrollFree) {
      this.setState({isScrollFree: false});
    }
  }

  render() {
    let animateHeight = this.state.refreshHeight.interpolate({
      inputRange: [-this.props.animationHeight, 0],
      outputRange: [this.props.animationHeight, 0]
    });

    const animationStyle = {
      backgroundColor: this.props.animationBackgroundColor,
      height: this.props.animationHeight
    };

    return  (
      <View
        style={[styles.container, { backgroundColor: this.props.animationBackgroundColor }]}
        {...this._panResponder.panHandlers}
      >
        <View style={[styles.animationContainer, animationStyle]}>
          <Animation
            style={this.props.animationStyle}
            source={this.props.onRefreshAnimationSrc}
            loop
            ref={loadingAnimation => (this.loadingAnimation = loadingAnimation)}
          />
        </View>

        <ScrollView
          ref="scrollComponentRef"
          scrollEnabled={this.state.isScrollFree}
          onScroll={this.onScrollEvent}
          onTouchEnd={this.isScrolledToTop}
          onScrollEndDrag={this.isScrolledToTop}
        >
          <Animated.View style={{marginTop: animateHeight}}>
            {React.cloneElement(this.props.contentView, {
              scrollEnabled: false,
              ref:'scrollComponentRef',
            })}
          </Animated.View>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

module.exports = AnimatedPullToRefresh;
