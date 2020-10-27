import path from "path";
import dotenv from "dotenv";
import BoxSDK from "box-node-sdk";

import BoxFS from "./fs/box";
import LocalFS from "./fs/local";
import Syncer from "./sync";

const main = async () => {
	const keyPath = process.env.BOX_KEY_PATH || "";
	const userId = process.env.BOX_USER_ID || "";

	const sdk = BoxSDK.getPreconfiguredInstance(require(path.resolve(process.cwd(), keyPath)));
	const client = sdk.getAppAuthClient("user", userId);

	const boxfs = new BoxFS(client, "0");
	const localfs = new LocalFS("./box");

	const syncer = new Syncer(boxfs, localfs);
	return syncer.sync();
};

dotenv.config();
main().catch(console.trace);
