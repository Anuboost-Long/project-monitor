import adhocSign from "./mac-adhoc-sign.mjs";

export default async function afterPack(context) {
	await adhocSign(context);
}
