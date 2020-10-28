import path from "path";
import BoxSDK from "box-node-sdk";

import BoxFS from "./box";
import LocalFS from "./local";
import { Tree, TreeNode } from "./internal";
import BoxClient from "../driver/box";

export const getInstance = (target: string): Tree<TreeNode> => {
	const [driver, root] = (() => {
		const [e1, e2] = target.split(":");
		return e2 ? [e1, e2] : ["local", e1];
	})();

	if (driver == "local") {
		return new LocalFS(root);
	}
	if (driver == "box") {
		const keyPath = process.env.BOX_KEY_PATH || "";
		const userId = process.env.BOX_USER_ID || "";

		const sdk = BoxSDK.getPreconfiguredInstance(require(path.resolve(process.cwd(), keyPath)));
		const client = sdk.getAppAuthClient("user", userId);

		const driver = new BoxClient(client);

		return new BoxFS(driver, root);
	}

	throw new Error(`unexpected driver: ${driver}`);
};
