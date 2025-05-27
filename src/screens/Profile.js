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
import { logoutUser, updateUser } from "../redux/authSlice"; // Import updateUser action
import { authAPI, studyAPI, api } from "../API/drugSpeakAPI";

export default function ProfileScreen({ navigation }) {
	const dispatch = useDispatch();
	const { user } = useSelector((state) => state.auth);
	const learningState = useSelector((state) => state.learning);

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
				totalScore: 0,
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

	// Reset form data when modal opens
	const openUpdateForm = () => {
		setFormData({
			username: user?.username || "",
			password: "",
			gender: user?.gender || "",
		});
		setShowUpdateForm(true);
	};

	const handleUpdate = async () => {
		// Validation
		if (!formData.username.trim()) {
			Alert.alert("Error", "Username cannot be empty");
			return;
		}

		if (formData.password && formData.password.length < 6) {
			Alert.alert("Error", "Password must be at least 6 characters");
			return;
		}

		// Check if user ID exists
		const userId = user?.id;
		if (!userId) {
			Alert.alert("Error", "User ID not found. Please sign in again.");
			return;
		}

		setIsUpdating(true);

		try {
			// Prepare update data - only include fields that have values
			const updateData = {
				username: formData.username.trim(),
				gender: formData.gender || "",
			};

			// Only include password if it's provided
			if (formData.password && formData.password.trim()) {
				updateData.password = formData.password.trim();
			}

			console.log("Updating user profile with data:", updateData);
			console.log("User ID:", userId);

			// Use the working endpoint from your API module
			let response;

			try {
				// Try the endpoint that's working: /users/update
				console.log("Trying PATCH /users/update");
				response = await api.patch("/users/update", updateData);
				console.log("Profile update successful:", response);
			} catch (error) {
				// If that fails, try with user ID in URL
				console.log(`Trying PATCH /users/${userId}`);
				response = await api.patch(`/users/${userId}`, updateData);
				console.log("Profile update successful with user ID:", response);
			}

			// Update Redux store with the server response data (not form data)
			const updatedUserData = response.data || response;

			// Merge with existing user data to preserve other fields
			const updatedUser = {
				...user,
				...updatedUserData,
			};

			console.log("Updating Redux with:", updatedUser);
			dispatch(updateUser(updatedUser));

			Alert.alert("Success", "Profile updated successfully!", [
				{
					text: "OK",
					onPress: () => setShowUpdateForm(false),
				},
			]);
		} catch (error) {
			console.error("Profile update error:", error);

			// Provide more specific error messages
			let errorMessage = "Failed to update profile. Please try again.";

			if (error.status === 400) {
				errorMessage = "Invalid data provided. Please check your inputs.";
			} else if (error.status === 401) {
				errorMessage = "Authentication failed. Please sign in again.";
			} else if (error.status === 403) {
				errorMessage = "You don't have permission to update this profile.";
			} else if (error.status === 404) {
				errorMessage = "Update endpoint not found. Please contact support.";
			} else if (error.message) {
				errorMessage = error.message;
			}

			Alert.alert("Update Failed", errorMessage);
		} finally {
			setIsUpdating(false);
		}
	};

	// Handle sign-out
	const handleSignOut = () => {
		Alert.alert("Sign Out", "Are you sure you want to sign out?", [
			{
				text: "Cancel",
				style: "cancel",
			},
			{
				text: "Sign Out",
				style: "destructive",
				onPress: () => {
					dispatch(logoutUser());
					navigation.navigate("HomeTabs", {
						screen: "Profile",
					});
				},
			},
		]);
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>User Profile</Text>

			{/* User Info */}
			<View style={styles.infoSection}>
				<Text style={styles.infoText}>User Name: {user?.username}</Text>
				<Text style={styles.infoText}>Email: {user?.email}</Text>
				<Text style={styles.infoText}>
					Gender: {user?.gender || "Not specified"}
				</Text>
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

				{/* Manual refresh button */}
				<TouchableOpacity
					style={styles.refreshButton}
					onPress={fetchStudyRecord}
					disabled={loadingStats}
				>
					<Text style={styles.refreshButtonText}>
						{loadingStats ? "Loading..." : "Refresh Stats"}
					</Text>
				</TouchableOpacity>
			</View>

			{/* Update Button */}
			<TouchableOpacity style={styles.updateButton} onPress={openUpdateForm}>
				<Text style={styles.updateButtonText}>Update Profile</Text>
			</TouchableOpacity>

			{/* Update Profile Modal */}
			<Modal visible={showUpdateForm} animationType="slide" transparent={true}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalTitle}>Update Profile</Text>

						<Text style={styles.label}>Username</Text>
						<TextInput
							value={formData.username}
							onChangeText={(text) =>
								setFormData({ ...formData, username: text })
							}
							style={styles.input}
							placeholder="Enter username"
							autoCapitalize="none"
						/>

						<Text style={styles.label}>New Password (Optional)</Text>
						<TextInput
							value={formData.password}
							onChangeText={(text) =>
								setFormData({ ...formData, password: text })
							}
							secureTextEntry
							style={styles.input}
							placeholder="Leave empty to keep current password"
							autoCapitalize="none"
						/>

						<Text style={styles.label}>Gender</Text>
						<TextInput
							value={formData.gender}
							onChangeText={(text) =>
								setFormData({ ...formData, gender: text })
							}
							style={styles.input}
							placeholder="Enter gender"
						/>

						<View style={styles.buttonRow}>
							<TouchableOpacity
								style={[styles.modalButton, styles.cancelButton]}
								onPress={() => setShowUpdateForm(false)}
								disabled={isUpdating}
							>
								<Text style={styles.cancelButtonText}>Cancel</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.modalButton,
									styles.confirmButton,
									isUpdating && styles.disabledButton,
								]}
								onPress={handleUpdate}
								disabled={isUpdating}
							>
								<Text style={styles.confirmButtonText}>
									{isUpdating ? "Updating..." : "Update"}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Sign Out Button */}
			<TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
				<Text style={styles.signOutButtonText}>Sign Out</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		backgroundColor: "#fff",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
		color: "#333",
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
	updateButton: {
		backgroundColor: "#2ecc71",
		padding: 15,
		borderRadius: 8,
		alignItems: "center",
		marginBottom: 15,
	},
	updateButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
	signOutButton: {
		backgroundColor: "#e74c3c",
		padding: 15,
		borderRadius: 8,
		alignItems: "center",
	},
	signOutButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContainer: {
		backgroundColor: "white",
		padding: 20,
		borderRadius: 10,
		width: "90%",
		maxWidth: 400,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
		color: "#333",
	},
	label: {
		marginBottom: 5,
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
	},
	input: {
		borderWidth: 1,
		borderColor: "#ddd",
		padding: 12,
		marginBottom: 15,
		borderRadius: 5,
		fontSize: 16,
		backgroundColor: "#f9f9f9",
	},
	buttonRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 20,
		gap: 10,
	},
	modalButton: {
		flex: 1,
		padding: 12,
		borderRadius: 5,
		alignItems: "center",
	},
	cancelButton: {
		backgroundColor: "#95a5a6",
	},
	confirmButton: {
		backgroundColor: "#3498db",
	},
	disabledButton: {
		backgroundColor: "#bdc3c7",
	},
	cancelButtonText: {
		color: "white",
		fontWeight: "bold",
	},
	confirmButtonText: {
		color: "white",
		fontWeight: "bold",
	},
});
