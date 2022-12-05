import mongoose, { ConnectOptions } from "mongoose";

const dbConnect = async (URI: string) => {
	try {
		await mongoose.connect(URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		} as ConnectOptions);
		console.log("Connected to DB");
	} catch (err) {
		console.log("Failed to connect to DB");
		console.error(err);
	}
};

export { dbConnect };
