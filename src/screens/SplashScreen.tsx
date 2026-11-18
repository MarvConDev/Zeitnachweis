import { Dimensions, Image, StyleSheet, View } from 'react-native';

const LOGO_ASPECT = 545 / 618;
const SCREEN_W = Dimensions.get('window').width;

export function SplashScreen() {
  const logoWidth = Math.min(SCREEN_W * 0.72, 300);

  return (
    <View style={styles.root}>
      <Image
        source={require('../../assets/splash-logo.png')}
        style={{ width: logoWidth, height: logoWidth / LOGO_ASPECT }}
        resizeMode="contain"
        accessibilityLabel="Safe Ground Solutions"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
