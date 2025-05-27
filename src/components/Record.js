import React, { useState, useEffect } from "react";
import { View, Button, StyleSheet, Text, Alert } from "react-native";
import { Audio } from "expo-av";

export default function App() {
	const [recording, setRecording] = useState(null);
	const [recordedUri, setRecordedUri] = useState(null);
	const [sound, setSound] = useState(null);
	const [isRecording, setIsRecording] = useState(false);

	useEffect(() => {
		(async () => {
			const { status } = await Audio.requestPermissionsAsync();
			if (status !== "granted") {
				Alert.alert("Permission to access microphone was denied");
			}
		})();
	}, []);

	const startRecording = async () => {
		try {
			await Audio.setAudioModeAsync({
				allowsRecordingIOS: true,
				playsInSilentModeIOS: true,
				// interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX, // Changed this line
				// interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
			});

			const { recording } = await Audio.Recording.createAsync(
				Audio.RecordingOptionsPresets.HIGH_QUALITY
			);
			setRecording(recording);
			setIsRecording(true);
		} catch (err) {
			console.error("Failed to start recording", err);
		}
	};

	const stopRecording = async () => {
		setRecording(undefined);
		setIsRecording(false);
		await recording.stopAndUnloadAsync();
		const uri = recording.getURI();
		setRecordedUri(uri);
		console.log("Recording saved to:", uri);
	};

	const playRecording = async () => {
		if (!recordedUri) return;

		const { sound } = await Audio.Sound.createAsync(
			{ uri: recordedUri },
			{ shouldPlay: true }
		);
		setSound(sound);
	};

	useEffect(() => {
		return () => {
			if (sound) {
				sound.unloadAsync();
			}
		};
	}, [sound]);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>🎤 Audio Recorder</Text>

			<Button
				title={isRecording ? "🛑 Stop Recording" : "🎤 Start Recording"}
				onPress={isRecording ? stopRecording : startRecording}
			/>

			<View style={{ height: 20 }} />

			<Button
				title="▶️ Play Recording"
				onPress={playRecording}
				disabled={!recordedUri}
			/>

			{recordedUri && <Text style={styles.path}>Saved to: {recordedUri}</Text>}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
		backgroundColor: "#ecf0f1",
	},
	title: {
		fontSize: 22,
		fontWeight: "bold",
		marginBottom: 20,
	},
	path: {
		marginTop: 20,
		fontSize: 12,
		color: "#555",
		textAlign: "center",
	},
});
