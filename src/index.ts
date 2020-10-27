import dotenv from "dotenv";
const BoxSDK = require("box-node-sdk");

import BoxFS from "./fs/box";
import LocalFS from "./fs/local";

const main = async () => {
	const clientID = process.env.SYNC_CLIENT_ID || "";
	const appToken = process.env.SYNC_APP_TOKEN || "";

	const sdk = new BoxSDK({ clientID, clientSecret: "" });
	const client = sdk.getBasicClient(appToken);

	const boxfs = new BoxFS(client, "0");
	const boxtree = await boxfs.tree();
	console.log(boxtree);

	const localfs = new LocalFS("./src");
	const localtree = await localfs.tree();
	localtree;
};

dotenv.config();
main().catch(console.trace);
