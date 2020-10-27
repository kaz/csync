import dotenv from "dotenv";
const BoxSDK = require("box-node-sdk");

import BoxFS from "./fs/box";
import LocalFS from "./fs/local";
import Syncer from "./sync";

const main = async () => {
	const clientID = process.env.SYNC_CLIENT_ID || "";
	const appToken = process.env.SYNC_APP_TOKEN || "";

	const sdk = new BoxSDK({ clientID, clientSecret: "" });
	const client = sdk.getBasicClient(appToken);

	const boxfs = new BoxFS(client, "0");
	const localfs = new LocalFS("./box");

	const syncer = new Syncer(boxfs, localfs);
	return syncer.sync();
};

dotenv.config();
main().catch(console.trace);
