import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  Image,
  StyleSheet,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  CameraDevice,
  CameraPermissionStatus,
} from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';

const MenuScanner: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isImageClear, setIsImageClear] = useState(false);

  // Get devices and manually select the back camera
  const devices = useCameraDevices(); 
  const device: CameraDevice | null =
  devices.find((d: CameraDevice) => d.position === 'back') ??
  devices.find((d: CameraDevice) => d.position === 'front') ??
  null;

  useEffect(() => {
    (async () => {
      const status: CameraPermissionStatus = await Camera.requestCameraPermission();
      if (status !== 'granted') {
        Alert.alert('Camera permission is required');
      }
    })();
  }, []);

  const capturePhoto = async () => {
    if (camera && device) {
      const photo = await camera.takePhoto();
      const resizedImage = await ImageManipulator.manipulateAsync(
        photo.path,
        [{ resize: { width: 500 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImage(resizedImage.uri);
      checkBlur(resizedImage.uri);
    }
  };

  const checkBlur = async (imageUri: string) => {
    try {
      const response = await fetch('http://your-server-ip:3000/check-blur', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUri }),
      });

      const data = await response.json();

      if (data.isBlurry) {
        Alert.alert('Retake Picture', 'The image is too blurry. Please retake the picture.');
        setImage(null);
        setIsImageClear(false);
      } else {
        Alert.alert('Image OK', 'Image is clear enough.');
        setIsImageClear(true);
      }
    } catch (error) {
      console.error('Error checking blur:', error);
      Alert.alert('Error', 'An error occurred while checking the image.');
      setImage(null);
      setIsImageClear(false);
    }
  };

  const handleSubmit = () => {
    Alert.alert('Submitted!', 'Your image was submitted successfully.');
    // Add your real submission logic here
  };

  if (!device) {
    return (
      <View style={styles.container}>
        <Text>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {image ? (
        <>
          <Image source={{ uri: image }} style={styles.image} />
          <View style={styles.buttonContainer}>
            {!isImageClear && (
              <Text style={styles.warningText}>
                Image too blurry, please retake.
              </Text>
            )}
            <Button
              title="Retake Photo"
              onPress={() => {
                setImage(null);
                setIsImageClear(false);
              }}
            />
            {isImageClear && (
              <Button title="Submit" onPress={handleSubmit} />
            )}
          </View>
        </>
      ) : (
        <>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            photo={true}
            ref={setCamera}
          />
          <View style={styles.buttonContainer}>
            <Button title="Take Picture" onPress={capturePhoto} />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '80%',
  },
  buttonContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 10,
  },
  warningText: {
    textAlign: 'center',
    color: 'red',
    marginBottom: 10,
  },
});

export default MenuScanner;
