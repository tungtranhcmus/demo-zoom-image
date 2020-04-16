import React, { PureComponent } from 'react';
import {
  SafeAreaView,
} from 'react-native';

import ScreenImage from './ScreenImage';

export default class Home extends PureComponent {

  constructor(props) {
    super(props);

  }

  render() {

    return (
      <SafeAreaView flex={1}>
        <ScreenImage
          urlImage={'https://kenh14cdn.com/thumb_w/620/2019/9/27/575061793121739594523578808931448312057510n-1569234622929668354670-15695179174971563375146.jpg'}/>
      </SafeAreaView>
    );

  }
}