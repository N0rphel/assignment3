import axios from "axios";
import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	ActivityIndicator,
	StyleSheet,
	Alert,
} from "react-native";
import { useSelector } from "react-redux";
import { getRankings } from "../API/drugSpeakAPI";
import { useNavigation } from "@react-navigation/native";
import { api as baseUrl } from "../API/drugSpeakAPI";
import { api } from "../API/drugSpeakAPI";

export default function CommunityScreen() {
	const [rankings, setRankings] = useState([]);
	const [loading, setLoading] = useState(true);
	const currentUserId = useSelector((state) => state.auth.user?.id);
	const navigation = useNavigation();

	const fetchRankings = async () => {
		try {
			setLoading(true);
			await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulated delay

			const response = await api.get("/study-record");

			const rawData = response.data;
			console.log(rawData);

			const formattedData = rawData.map((item) => ({
				id: item.userId,
				name: item.user?.username || "Unknown",
				gender: item.user?.gender || "N/A",
				score: item.totalScore,
				learningCount: item.currentLearning,
				finishedCount: item.finishedLearning,
			}));

			// Sort by totalScore descending
			formattedData.sort((a, b) => b.score - a.score);
			setRankings(formattedData);
		} catch (error) {
			console.error("Error fetching rankings:", error);
			Alert.alert("Error", "Failed to fetch rankings");
		} finally {
			setLoading(false);
		}
	};

	// Fetch rankings on component mount and when screen comes into focus
	useEffect(() => {
		const unsubscribe = navigation.addListener("focus", () => {
			fetchRankings();
		});

		// Initial fetch
		fetchRankings();

		return unsubscribe;
	}, [navigation]);

	const TableHeader = () => (
		<View style={styles.tableRow}>
			<Text style={[styles.tableCell, styles.headerCell, styles.rankColumn]}>
				Rank
			</Text>
			<Text style={[styles.tableCell, styles.headerCell, styles.nameColumn]}>
				Name
			</Text>
			<Text style={[styles.tableCell, styles.headerCell, styles.genderColumn]}>
				Gender
			</Text>
			<Text
				style={[styles.tableCell, styles.headerCell, styles.progressColumn]}
			>
				Progress
			</Text>
		</View>
	);

	const TableRow = ({ item, index }) => (
		<View
			style={[
				styles.tableRow,
				item.id === currentUserId && styles.highlightedRow,
				index % 2 === 0 && styles.evenRow,
			]}
		>
			<Text style={[styles.tableCell, styles.rankColumn]}>{index + 1}</Text>
			<Text style={[styles.tableCell, styles.nameColumn]}>{item.name}</Text>
			<Text style={[styles.tableCell, styles.genderColumn]}>{item.gender}</Text>
			<View style={[styles.tableCell, styles.progressColumn]}>
				<Text style={styles.scoreText}>Score: {item.score}</Text>
				<Text style={styles.progressText}>Learning: {item.learningCount}</Text>
				<Text style={styles.progressText}>Finished: {item.finishedCount}</Text>
			</View>
		</View>
	);

	const renderEmptyComponent = () => (
		<View style={styles.emptyContainer}>
			<Text style={styles.emptyText}>No rankings available</Text>
		</View>
	);

	return (
		<View style={styles.container}>
			<Text style={styles.header}>Community Rankings</Text>
			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#4287f5" />
					<Text style={styles.loadingText}>Loading rankings...</Text>
				</View>
			) : rankings.length === 0 ? (
				renderEmptyComponent()
			) : (
				<ScrollView
					style={styles.tableContainer}
					showsVerticalScrollIndicator={false}
				>
					<TableHeader />
					{rankings.map((item, index) => (
						<TableRow key={item.id.toString()} item={item} index={index} />
					))}
				</ScrollView>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		backgroundColor: "#fff",
	},
	header: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 16,
		textAlign: "center",
		color: "#333",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: 10,
		fontSize: 16,
		color: "#666",
	},
	tableContainer: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#ddd",
		minHeight: 50,
		alignItems: "center",
	},
	evenRow: {
		backgroundColor: "#f9f9f9",
	},
	highlightedRow: {
		backgroundColor: "#e6f7ff",
		borderLeftWidth: 4,
		borderLeftColor: "#4287f5",
	},
	tableCell: {
		paddingHorizontal: 8,
		paddingVertical: 12,
		textAlign: "center",
	},
	headerCell: {
		backgroundColor: "#f0f0f0",
		fontWeight: "bold",
		fontSize: 16,
		color: "#333",
		borderBottomWidth: 2,
		borderBottomColor: "#ccc",
	},
	rankColumn: {
		flex: 0.8,
		fontSize: 14,
	},
	nameColumn: {
		flex: 2,
		fontSize: 14,
		textAlign: "left",
	},
	genderColumn: {
		flex: 1,
		fontSize: 14,
	},
	progressColumn: {
		flex: 2.5,
		alignItems: "flex-start",
		textAlign: "left",
	},
	scoreText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#333",
		marginBottom: 2,
	},
	progressText: {
		fontSize: 12,
		color: "#666",
		marginBottom: 1,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingTop: 50,
	},
	emptyText: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
	},
});
