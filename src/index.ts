import dotenv from "dotenv";
import { getInstance } from "./fs";
import Syncer from "./sync";

const run = async (src: string, dst: string) => {
	const syncer = new Syncer(getInstance(src), getInstance(dst));
	return syncer.sync();
};

const main = async () => {
	const [, , src, dst] = process.argv;
	return run(src, dst);
};

dotenv.config();
main().catch(console.trace);
