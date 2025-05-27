import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
	Alert,
} from "react-native";
import { Audio } from "expo-av";
import { useDispatch, useSelector } from "react-redux";
import { finishDrug, removeDrug } from "../redux/learningSlice";
import { selectCurrentUser } from "../redux/authSlice";
import { studyAPI } from "../API/drugSpeakAPI";
import PronunciationPlayer from "../components/PronunciationPlayer";
import { drugCategory } from "../../resources/resource";
import { Ionicons } from "@expo/vector-icons";

export default function LearningScreen({ route, navigation }) {
	const { drug } = route.params;
	const [openIndex, setOpenIndex] = useState(null);
	const [playbackSpeeds, setPlaybackSpeeds] = useState({}); // Track speeds for each player
	const dispatch = useDispatch();
	const user = useSelector(selectCurrentUser);
	const userId = user?.id;

	// State for study record
	const [studyRecord, setStudyRecord] = useState(null);
	const [isUpdatingRecord, setIsUpdatingRecord] = useState(false);

	const [recordings, setRecordings] = useState([]);
	const [recording, setRecording] = useState(null);
	const [sound, setSound] = useState(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentPlayingIndex, setCurrentPlayingIndex] = useState(null);

	useEffect(() => {
		// Initialize playback speeds for each pronunciation
		const initialSpeeds = {};
		drug.sounds.forEach((_, index) => {
			initialSpeeds[index] = 1.0; // Default speed 1.0x
		});
		setPlaybackSpeeds(initialSpeeds);

		// Fetch current study record
		if (userId) {
			fetchStudyRecord();
		}

		return () => {
			// Cleanup sound when component unmounts
			if (sound) {
				sound.unloadAsync();
			}
			if (recording) {
				recording.stopAndUnloadAsync();
			}
		};
	}, [userId]);

	const fetchStudyRecord = async () => {
		try {
			const response = await studyAPI.getStudyRecord(userId);
			setStudyRecord(response);
			console.log("Learning Screen - Study record fetched:", response);
		} catch (error) {
			console.log("Learning Screen - No study record found:", error.message);
			// Set default values if no record exists
			setStudyRecord({
				currentLearning: 0,
				finishedLearning: 0,
				totalScore: 0
			});
		}
	};

	const handleSpeedChange = (index, newSpeed) => {
		setPlaybackSpeeds((prev) => ({
			...prev,
			[index]: newSpeed,
		}));
	};

	const calculateMaxScore = () => {
		if (recordings.length === 0) return 0;
		const scores = recordings
			.filter(recording => recording.score !== null)
			.map(recording => recording.score);
		return scores.length > 0 ? Math.max(...scores) : 0;
	};

	const updateStudyRecordWithScore = async (maxScore) => {
		if (!studyRecord || !userId) return false;

		try {
			setIsUpdatingRecord(true);
			
			const updatedRecord = {
				currentLearning: Math.max(0, (studyRecord.currentLearning || 0) - 1),
				finishedLearning: (studyRecord.finishedLearning || 0) + 1,
				totalScore: (studyRecord.totalScore || 0) + maxScore,
			};

			await studyAPI.createOrUpdateRecord(userId, updatedRecord);
			setStudyRecord(prev => ({ ...prev, ...updatedRecord }));
			
			console.log("Study record updated:", updatedRecord);
			return true;
		} catch (error) {
			console.error("Failed to update study record:", error.message);
			Alert.alert("Error", "Failed to update your progress. Please try again.");
			return false;
		} finally {
			setIsUpdatingRecord(false);
		}
	};

	const handleFinish = async () => {
		// Check if there are any evaluated recordings
		const evaluatedRecordings = recordings.filter(r => r.score !== null);
		
		if (evaluatedRecordings.length === 0) {
			Alert.alert(
				"No Evaluated Recordings", 
				"Please record and evaluate at least one pronunciation before finishing.",
				[{ text: "OK" }]
			);
			return;
		}

		const maxScore = calculateMaxScore();
		
		Alert.alert(
			"Finish Learning",
			`Your best score: ${maxScore}\nThis will be added to your total score. Continue?`,
			[
				{
					text: "Cancel",
					style: "cancel",
				},
				{
					text: "Finish",
					onPress: async () => {
						const success = await updateStudyRecordWithScore(maxScore);
						if (success) {
							dispatch(finishDrug(drug.id));
							Alert.alert(
								"Congratulations!", 
								`You've completed learning ${drug.name}!\nScore earned: ${maxScore}`,
								[{ 
									text: "OK", 
									onPress: () => navigation.goBack() 
								}]
							);
						}
					},
				},
			]
		);
	};

	const handleRemove = () => {
		Alert.alert(
			"Remove from Learning",
			`Remove ${drug.name} from your learning list?`,
			[
				{
					text: "Cancel",
					style: "cancel",
				},
				{
					text: "Remove",
					style: "destructive",
					onPress: () => {
						dispatch(removeDrug(drug.id));
						navigation.goBack();
					},
				},
			]
		);
	};

	const startRecording = async () => {
		try {
			const { status } = await Audio.requestPermissionsAsync();
			if (status !== "granted") {
				Alert.alert("Permission required", "Microphone permission is needed.");
				return;
			}

			await Audio.setAudioModeAsync({
				allowsRecordingIOS: true,
				playsInSilentModeIOS: true,
				shouldDuckAndroid: true,
			});

			const { recording } = await Audio.Recording.createAsync(
				Audio.RecordingOptionsPresets.HIGH_QUALITY
			);
			setRecording(recording);
		} catch (err) {
			console.error("Failed to start recording", err);
			Alert.alert("Error", "Could not start recording.");
		}
	};

	const stopRecording = async () => {
		try {
			if (!recording) return;

			await recording.stopAndUnloadAsync();
			const uri = recording.getURI();
			setRecordings([...recordings, { uri, date: new Date(), score: null }]);
			setRecording(null);

			// Reset audio mode after recording
			await Audio.setAudioModeAsync({
				allowsRecordingIOS: false,
			});
		} catch (err) {
			console.error("Failed to stop recording", err);
			Alert.alert("Error", "Could not stop recording.");
		}
	};

	const playRecording = async (uri, index) => {
		try {
			// Stop any currently playing sound
			if (sound) {
				await sound.unloadAsync();
				setSound(null);
				setIsPlaying(false);
			}

			// Set the new playing index
			setCurrentPlayingIndex(index);
			setIsPlaying(true);

			const { sound: newSound } = await Audio.Sound.createAsync(
				{ uri },
				{ shouldPlay: true }
			);
			setSound(newSound);

			newSound.setOnPlaybackStatusUpdate((status) => {
				if (status.didJustFinish) {
					setIsPlaying(false);
					setCurrentPlayingIndex(null);
				}
			});

			await newSound.playAsync();
		} catch (err) {
			console.error("Failed to play recording", err);
			Alert.alert("Error", "Could not play recording.");
		}
	};

	const stopPlayback = async () => {
		if (sound) {
			await sound.stopAsync();
			setIsPlaying(false);
			setCurrentPlayingIndex(null);
		}
	};

	const evaluateRecording = (index) => {
		const score = Math.floor(Math.random() * 101);
		const updated = [...recordings];
		updated[index].score = score;
		setRecordings(updated);
		
		Alert.alert("Evaluation Complete", `Score: ${score}/100`);
	};

	const deleteRecording = (index) => {
		Alert.alert(
			"Delete Recording",
			"Are you sure you want to delete this recording?",
			[
				{
					text: "Cancel",
					style: "cancel",
				},
				{
					text: "Delete",
					style: "destructive",
					onPress: () => {
						const updatedRecordings = [...recordings];
						updatedRecordings.splice(index, 1);
						setRecordings(updatedRecordings);

						// If the deleted recording was playing, stop it
						if (currentPlayingIndex === index) {
							stopPlayback();
						}
					},
				},
			]
		);
	};

	// Calculate current max score for display
	const currentMaxScore = calculateMaxScore();
	const hasEvaluatedRecordings = recordings.some(r => r.score !== null);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{drug.name}</Text>
			<Text style={styles.subtext}>({drug.molecular_formula})</Text>
			<Text style={styles.categories}>
				Categories:{" "}
				{drug.categories.map((id) => drugCategory[id]?.name || id).join(", ")}
			</Text>
			<Text style={styles.desc}>{drug.desc}</Text>

			{/* Score Display */}
			{hasEvaluatedRecordings && (
				<View style={styles.scoreContainer}>
					<Text style={styles.scoreText}>
						Current Best Score: {currentMaxScore}/100
					</Text>
				</View>
			)}

			<FlatList
				data={drug.sounds}
				keyExtractor={(item) => `${item.gender}-${item.file}`}
				renderItem={({ item, index }) => (
					<PronunciationPlayer
						label={drug.name}
						sound={item.file}
						gender={item.gender}
						isOpen={openIndex === index}
						onOpen={() => setOpenIndex(index)}
						onClose={() => setOpenIndex(null)}
						speed={playbackSpeeds[index] || 1.0}
						onSpeedChange={(newSpeed) => handleSpeedChange(index, newSpeed)}
					/>
				)}
			/>

			<FlatList
				data={recordings}
				keyExtractor={(item, index) => item.uri + index}
				renderItem={({ item, index }) => (
					<View style={styles.recordingItem}>
						<View style={styles.recordingControls}>
							{currentPlayingIndex === index && isPlaying ? (
								<TouchableOpacity onPress={stopPlayback}>
									<Ionicons name="stop" size={24} color="red" />
								</TouchableOpacity>
							) : (
								<TouchableOpacity
									onPress={() => playRecording(item.uri, index)}
								>
									<Ionicons name="play" size={24} color="green" />
								</TouchableOpacity>
							)}
						</View>
						<Text>Recording {index + 1}</Text>
						<View style={styles.recordingActions}>
							<TouchableOpacity
								style={[
									styles.evalButton,
									item.score !== null && styles.evaluatedButton
								]}
								onPress={() => evaluateRecording(index)}
							>
								<Text style={styles.evalText}>
									{item.score !== null ? `Score: ${item.score}` : "Evaluate"}
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => deleteRecording(index)}
								style={styles.deleteButton}
							>
								<Ionicons name="trash" size={20} color="white" />
							</TouchableOpacity>
						</View>
					</View>
				)}
			/>

			<View style={styles.recordContainer}>
				<TouchableOpacity
					style={styles.recordButton}
					onPressIn={startRecording}
					onPressOut={stopRecording}
				>
					<Text style={styles.recordText}>Hold to Record</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.buttonContainer}>
				<TouchableOpacity 
					onPress={handleFinish} 
					style={[
						styles.finishButton,
						isUpdatingRecord && styles.disabledButton
					]}
					disabled={isUpdatingRecord}
				>
					<Text style={styles.buttonText}>
						{isUpdatingRecord ? "UPDATING..." : "FINISH"}
					</Text>
				</TouchableOpacity>

				<TouchableOpacity 
					onPress={handleRemove} 
					style={styles.removeButton}
					disabled={isUpdatingRecord}
				>
					<Text style={styles.buttonText}>REMOVE</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		textAlign: "center",
	},
	subtext: {
		marginTop: 15,
		textAlign: "center",
		fontSize: 13,
	},
	categories: {
		marginTop: 10,
		textAlign: "center",
	},
	desc: {
		marginTop: 10,
		fontSize: 15,
		textAlign: "justify",
	},
	scoreContainer: {
		backgroundColor: "#e8f5e8",
		padding: 10,
		borderRadius: 8,
		marginVertical: 10,
		alignItems: "center",
	},
	scoreText: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#2e7d32",
	},
	recordContainer: {
		alignItems: "center",
		marginVertical: 20,
	},
	recordButton: {
		backgroundColor: "#e0564c",
		borderRadius: 100,
		width: 100,
		height: 100,
		justifyContent: "center",
		alignItems: "center",
	},
	recordText: {
		color: "white",
		fontWeight: "400",
		fontSize: 12,
	},
	recordingItem: {
		padding: 10,
		marginVertical: 5,
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 6,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	recordingControls: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	recordingActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	evalButton: {
		backgroundColor: "#4287f5",
		paddingVertical: 5,
		paddingHorizontal: 10,
		borderRadius: 5,
	},
	evaluatedButton: {
		backgroundColor: "#2e7d32",
	},
	deleteButton: {
		backgroundColor: "#ff4444",
		padding: 5,
		borderRadius: 5,
	},
	evalText: {
		color: "white",
	},
	buttonContainer: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginTop: 20,
	},
	finishButton: {
		backgroundColor: "#4287f5",
		paddingVertical: 12,
		paddingHorizontal: 25,
		borderRadius: 8,
	},
	removeButton: {
		backgroundColor: "#ff4444",
		paddingVertical: 12,
		paddingHorizontal: 25,
		borderRadius: 8,
	},
	disabledButton: {
		backgroundColor: "#cccccc",
	},
	buttonText: {
		color: "white",
		textAlign: "center",
		fontWeight: "bold",
	},
});