import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	Button,
	Modal,
	TextInput,
	Alert,
	StyleSheet,
	TouchableOpacity,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { logoutUser } from "../redux/authSlice";
import { updateUserProfile, studyAPI } from "../API/drugSpeakAPI";

export default function ProfileScreen({ navigation }) {
	const dispatch = useDispatch();
	const { user } = useSelector((state) => state.auth);
	const learningState = useSelector((state) => state.learning); // Keep for Redux stats
	
	// State for API study record
	const [studyRecord, setStudyRecord] = useState(null);
	const [loadingStats, setLoadingStats] = useState(true);
	
	const [isUpdating, setIsUpdating] = useState(false);
	const [showUpdateForm, setShowUpdateForm] = useState(false);
	const [formData, setFormData] = useState({
		username: user?.username || "",
		password: "",
		gender: user?.gender || "",
	});

	const fetchStudyRecord = async () => {
		try {
			setLoadingStats(true);
			const response = await studyAPI.getStudyRecord(user.id);
			setStudyRecord(response);
			console.log("Profile - Study record fetched:", response);
		} catch (error) {
			console.log("Profile - No study record found:", error.message);
			// Set default values if no record exists
			setStudyRecord({
				currentLearning: 0,
				finishedLearning: 0,
				totalScore: 0
			});
		} finally {
			setLoadingStats(false);
		}
	};

	// Fetch study record on component mount
	useEffect(() => {
		if (user?.id) {
			fetchStudyRecord();
		}
	}, [user?.id]);

	// Auto-refresh stats when screen comes into focus
	useFocusEffect(
		React.useCallback(() => {
			if (user?.id) {
				fetchStudyRecord();
			}
		}, [user?.id])
	);

	const handleUpdate = async () => {
		if (!formData.username.trim()) {
			Alert.alert("Error", "Username cannot be empty");
			return;
		}
		if (formData.password && formData.password.length < 6) {
			Alert.alert("Error", "Password must be at least 6 characters");
			return;
		}
		setIsUpdating(true);
		try {
			await updateUserProfile(user._id, {
				username: formData.username,
				...(formData.password && { password: formData.password }),
				gender: formData.gender,
			});
			Alert.alert("Success", "Profile updated!");
			setShowUpdateForm(false);
		} catch (error) {
			Alert.alert("Error", error.message || "Update failed");
		} finally {
			setIsUpdating(false);
		}
	};

	// Handle sign-out
	const handleSignOut = () => {
		dispatch(logoutUser());
		navigation.navigate("HomeTabs", {
			screen: "Profile",
		});
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>User Profile</Text>
			
			{/* User Info */}
			<View style={styles.infoSection}>
				<Text style={styles.infoText}>User Name: {user?.username}</Text>
				<Text style={styles.infoText}>Email: {user?.email}</Text>
				<Text style={styles.infoText}>Gender: {user?.gender}</Text>
			</View>

			{/* Learning Stats */}
			<View style={styles.statsSection}>
				<Text style={styles.statsTitle}>Learning Statistics</Text>
				
				{loadingStats ? (
					<Text style={styles.loadingText}>Loading stats...</Text>
				) : (
					<>
						<Text style={styles.statsText}>
							Current Learning: {studyRecord?.currentLearning || 0}
						</Text>
						<Text style={styles.statsText}>
							Finished: {studyRecord?.finishedLearning || 0}
						</Text>
						<Text style={styles.statsText}>
							Total Score: {studyRecord?.totalScore || 0}
						</Text>
						
					</>
				)}
				
				{/* Manual refresh button (now optional since auto-refresh is enabled) */}
				<TouchableOpacity 
					style={styles.refreshButton} 
					onPress={fetchStudyRecord}
					disabled={loadingStats}
				>
					<Text style={styles.refreshButtonText}>
						{loadingStats ? "Loading..." : "Manual Refresh"}
					</Text>
				</TouchableOpacity>
			</View>

			{/* Update Button */}
			<Button title="Update Profile" onPress={() => setShowUpdateForm(true)} />

			{/* Update Profile Modal */}
			<Modal visible={showUpdateForm} animationType="slide">
				<View style={styles.modalContainer}>
					<Text style={styles.modalTitle}>Update Profile</Text>
					<Text style={styles.label}>New User Name</Text>
					<TextInput
						value={formData.username}
						onChangeText={(text) =>
							setFormData({ ...formData, username: text })
						}
						style={styles.input}
					/>
					<Text style={styles.label}>New Password</Text>
					<TextInput
						value={formData.password}
						onChangeText={(text) =>
							setFormData({ ...formData, password: text })
						}
						secureTextEntry
						style={styles.input}
						placeholder="Leave empty to keep current password"
					/>
					<View style={styles.buttonRow}>
						<Button
							title="Cancel"
							onPress={() => setShowUpdateForm(false)}
							disabled={isUpdating}
						/>
						<Button
							title={isUpdating ? "Updating..." : "Confirm"}
							onPress={handleUpdate}
							disabled={isUpdating}
						/>
					</View>
				</View>
			</Modal>

			{/* Sign Out Button */}
			<Button title="Sign Out" onPress={handleSignOut} color="red" />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
	},
	infoSection: {
		backgroundColor: "#f8f9fa",
		padding: 15,
		borderRadius: 8,
		marginBottom: 20,
	},
	infoText: {
		fontSize: 16,
		marginBottom: 5,
		color: "#333",
	},
	statsSection: {
		backgroundColor: "#e8f4f8",
		padding: 15,
		borderRadius: 8,
		marginBottom: 20,
	},
	statsTitle: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 10,
		color: "#2c3e50",
	},
	statsText: {
		fontSize: 16,
		marginBottom: 5,
		color: "#34495e",
	},
	loadingText: {
		fontSize: 16,
		color: "#7f8c8d",
		fontStyle: "italic",
	},
	reduxStats: {
		marginTop: 10,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: "#bdc3c7",
	},
	reduxStatsTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#7f8c8d",
	},
	reduxStatsText: {
		fontSize: 14,
		color: "#7f8c8d",
	},
	refreshButton: {
		backgroundColor: "#3498db",
		padding: 10,
		borderRadius: 5,
		marginTop: 10,
		alignItems: "center",
	},
	refreshButtonText: {
		color: "white",
		fontWeight: "bold",
	},
	modalContainer: {
		flex: 1,
		justifyContent: "center",
		padding: 20,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 10,
	},
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		padding: 10,
		marginBottom: 10,
		borderRadius: 5,
	},
	buttonRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginTop: 20,
	},
	label: {
		marginBottom: 5,
		fontSize: 16,
		fontWeight: "600",
	},
});