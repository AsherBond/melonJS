import * as me from "melonjs";
// import { DebugPanelPlugin } from "debugPlugin";
import { PlayScreen } from "./screens/play.js";
import paladinJson from "./assets/paladin.json?url";
import paladinPng from "./assets/paladin.png";

const resources = [
	{ name: "paladin", type: "json", src: paladinJson },
	{ name: "paladin", type: "image", src: paladinPng },
];

export const game = {
	// Run on page load.
	onload: () => {
		// Initialize the video.
		if (
			!me.video.init(640, 480, {
				parent: "screen",
				scale: "auto",
				scaleMethod: "fill",
			})
		) {
			alert("Your browser does not support HTML5 canvas.");
			return;
		}

		// register the debug plugin
		// me.plugin.register(DebugPanelPlugin,  "debugPanel");

		me.loader.setOptions({ withCredentials: true });

		// set all ressources to be loaded
		me.loader.preload(resources, () => {
			me.state.set(me.state.PLAY, new PlayScreen());

			// Start the game.
			me.state.change(me.state.PLAY);
		});
	},
};
