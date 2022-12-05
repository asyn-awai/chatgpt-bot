import axios from "axios";
import { Cookie } from "tough-cookie";
import { v4 as uuidv4 } from "uuid";

export default class Chatbot {
	parentId: string;
	headers: {
		Accept: string;
		Authorization: string;
		"Content-Type": string;
	};

	constructor(
		private config: {
			Authorization: string;
			SessionToken: string;
		},
		private conversationId: string | null = null,
		lastParentId: string | null = null
	) {
		this.parentId = lastParentId ?? this.generateUuid();
		this.headers = {
			Accept: "application/json",
			Authorization: `Bearer ${this.config["Authorization"]}`,
			"Content-Type": "application/json",
		};
	}

	private refreshHeaders() {
		this.headers = {
			Accept: "application/json",
			Authorization: `Bearer ${this.config["Authorization"]}`,
			"Content-Type": "application/json",
		};
	}

	private generateUuid() {
		const uid = uuidv4();
		return uid;
	}

	public async getChatResponse(prompt: string): Promise<
		| {
				message: string;
				conversationId: string | null;
				parentId: string;
		  }
		| string
	> {
		const data = {
			action: "next",
			messages: [
				{
					id: this.generateUuid(),
					role: "user",
					content: { content_type: "text", parts: [prompt] },
				},
			],
			conversation_id: this.conversationId,
			parent_message_id: this.parentId,
			model: "text-davinci-002-render",
		};

		try {
			// console.log(data)
			// console.log(this.headers)
			const response = await axios.post(
				"https://chat.openai.com/backend-api/conversation",
				JSON.stringify(data),
				{ headers: this.headers }
			);
			const responseData = response.data.split("\n").at(-5);

			if (!responseData) {
				throw new Error("Error parsing response");
			}

			const responseJson = JSON.parse(responseData.slice(6));
			this.parentId = responseJson.message.id;
			this.conversationId = responseJson.conversation_id;
			const message = responseJson.message.content.parts[0];
			return {
				message,
				conversationId: this.conversationId,
				parentId: this.parentId,
			};
		} catch (error: any) {
			if (typeof error === "string") return error;
			return error.response.data.detail;
		}
	}

	public async refreshSession() {
		if (!("SessionToken" in this.config)) {
			throw new Error("No session token provided");
		}

		const session = axios.create({
			withCredentials: true,
			headers: {
				common: {
					Authorization: this.config["Authorization"],
				},
			},
		});
		const cookies = [
			new Cookie({
				key: "__Secure-next-auth.session-token",
				value: this.config["SessionToken"],
			}),
		];

		const res = await session.get(
			"https://chat.openai.com/api/auth/session",
			{
				headers: {
					Cookie: cookies.map(c => c.cookieString()).join("; "),
				},
			}
		);
		try {
			const sessionToken = res.headers["set-cookie"]
				?.find(c => c.startsWith("__Secure-next-auth.session-token"))
				?.split("=")[1];
			if (!sessionToken) throw new Error("No cookie found");
			this.config["SessionToken"] = sessionToken;
			this.config["Authorization"] = res.data["accessToken"];
			this.refreshHeaders();
		} catch (e) {
			console.error("Error refreshing session");
			console.error(res.data);
			console.error(e);
		}
	}
}
