import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { useSelector } from "react-redux";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { studyAPI } from "../API/drugSpeakAPI"; // Import your API
import { selectCurrentUser } from "../redux/authSlice"; // Import user selector

export default function LearningList() {
	const navigation = useNavigation();
	const currentLearning = useSelector(state => state.learning.current);
	const finishedLearning = useSelector(state => state.learning.finished);
	const user = useSelector(selectCurrentUser);
	const userId = user?.id;

	// State for API data
	const [studyRecord, setStudyRecord] = useState(null);
	const [loading, setLoading] = useState(true);

	const [showCurrent, setShowCurrent] = useState(false);
	const [showFinished, setShowFinished] = useState(false);

	const toggleCurrent = () => setShowCurrent(!showCurrent);
	const toggleFinished = () => setShowFinished(!showFinished);

	const fetchStudyRecord = async () => {
		try {
			setLoading(true);
			const response = await studyAPI.getStudyRecord(userId);
			setStudyRecord(response);
			console.log("Study record fetched:", response);
		} catch (error) {
			console.log("No study record found:", error.message);
			// Set default values if no record exists
			setStudyRecord({
				currentLearning: 0,
				finishedLearning: 0,
				totalScore: 0
			});
		} finally {
			setLoading(false);
		}
	};

	// Fetch study record on component mount
	useEffect(() => {
		if (userId) {
			fetchStudyRecord();
		}
	}, [userId]);

	// Refetch data when screen comes into focus
	useFocusEffect(
		React.useCallback(() => {
			if (userId) {
				fetchStudyRecord();
			}
		}, [userId])
	);

	const renderDrug = ({ item }) => (
		<TouchableOpacity
			onPress={() => navigation.navigate('LearningScreen', { drug: item })}
			style={styles.drugItem}>
			<Text>{item.name}</Text>
		</TouchableOpacity>
	);

	// Show loading state
	if (loading) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>Learning List</Text>
				<Text>Loading...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Current Learning */}
			<Text style={styles.title}>Learning List</Text>
			
			{/* Display API counts alongside Redux counts */}
			<View style={styles.statsContainer}>
				<Text style={styles.statsText}>
					Current: {studyRecord?.currentLearning || 0}, 
					Finished: {studyRecord?.finishedLearning || 0}, 
					Total Score: {studyRecord?.totalScore || 0}
				</Text>
			</View>

			<View style={styles.section}>
				<TouchableOpacity style={styles.header} onPress={toggleCurrent}>
					<Text style={styles.headerText}>
						Current Learning ({studyRecord?.currentLearning || 0})
					</Text>
					<Ionicons
						name={showCurrent ? 'remove' : 'add'}
						size={20}
						color="black"
					/>
				</TouchableOpacity>
				{showCurrent && (
					<FlatList
						data={currentLearning}
						keyExtractor={(item) => item.id}
						renderItem={renderDrug}
					/>
				)}
			</View>

			{/* Finished Learning */}
			<TouchableOpacity style={styles.header} onPress={toggleFinished}>
				<Text style={styles.headerText}>
					Finished ({studyRecord?.finishedLearning || 0})
				</Text>
				<Ionicons
					name={showFinished ? 'remove' : 'add'}
					size={20}
					color="black"
				/>
			</TouchableOpacity>
			{showFinished && (
				<FlatList
					data={finishedLearning}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<View style={styles.drugItem}>
							<Text>{item.name}</Text>
						</View>
					)}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10,
		backgroundColor: '#fff',
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'left',
		marginTop: 30,
		marginBottom: 10,
	},
	statsContainer: {
		backgroundColor: '#e8f4f8',
		padding: 10,
		borderRadius: 5,
		marginBottom: 10,
	},
	statsText: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
	},
	section: {
		marginBottom: 10,
	},
	header: {
		marginTop: 10,
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: 20,
		borderBottomWidth: 1,
		borderColor: '#ccc',
		backgroundColor: '#f2f2f2',
	},
	headerText: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	drugItem: {
		padding: 10,
		borderRadius: 8,
		borderBottomWidth: 1,
		marginVertical: 1,
	},
});