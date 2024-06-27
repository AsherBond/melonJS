import Vector2d from "./../../../math/vector2.js";
import pool from "./../../../system/pooling.js";
import TMXRenderer from "./TMXRenderer.js";
import TMXLayer from "./../TMXLayer.js";

/**
 * an Isometric Map Renderder
 */
export default class TMXIsometricRenderer extends TMXRenderer {
	/**
	 * @param {TMXTileMap} map - the TMX map
	 */
	constructor(map) {
		super(map.cols, map.rows, map.tilewidth, map.tileheight);

		this.hTilewidth = this.tilewidth / 2;
		this.hTileheight = this.tileheight / 2;
		this.originX = this.rows * this.hTilewidth;
	}

	/**
	 * return true if the renderer can render the specified layer
	 * @ignore
	 */
	canRender(layer) {
		return layer.orientation === "isometric" && super.canRender(layer);
	}

	/**
	 * return the bounding rect for this map renderer
	 * @ignore
	 */
	getBounds(layer) {
		const bounds =
			layer instanceof TMXLayer ? pool.pull("Bounds") : this.bounds;
		bounds.setMinMax(
			0,
			0,
			(this.cols + this.rows) * (this.tilewidth / 2),
			(this.cols + this.rows) * (this.tileheight / 2),
		);
		return bounds;
	}

	/**
	 * return the tile position corresponding to the specified pixel
	 * @ignore
	 */
	pixelToTileCoords(x, y, v) {
		const ret = v || new Vector2d();
		return ret.set(
			y / this.tileheight + (x - this.originX) / this.tilewidth,
			y / this.tileheight - (x - this.originX) / this.tilewidth,
		);
	}

	/**
	 * return the pixel position corresponding of the specified tile
	 * @ignore
	 */
	tileToPixelCoords(x, y, v) {
		const ret = v || new Vector2d();
		return ret.set(
			(x - y) * this.hTilewidth + this.originX,
			(x + y) * this.hTileheight,
		);
	}

	/**
	 * fix the position of Objects to match
	 * the way Tiled places them
	 * @ignore
	 */
	adjustPosition(obj) {
		const tileX = obj.x / this.hTilewidth;
		const tileY = obj.y / this.tileheight;
		const isoPos = pool.pull("Vector2d");

		this.tileToPixelCoords(tileX, tileY, isoPos);

		obj.x = isoPos.x;
		obj.y = isoPos.y;

		pool.push(isoPos);
	}

	/**
	 * draw the tile map
	 * @ignore
	 */
	drawTile(renderer, x, y, tmxTile) {
		const tileset = tmxTile.tileset;
		// draw the tile
		tileset.drawTile(
			renderer,
			((this.cols - 1) * tileset.tilewidth + (x - y) * tileset.tilewidth) >> 1,
			(-tileset.tilewidth + (x + y) * tileset.tileheight) >> 2,
			tmxTile,
		);
	}

	/**
	 * draw the tile map
	 * @ignore
	 */
	drawTileLayer(renderer, layer, rect) {
		// cache a couple of useful references
		let tileset = layer.tileset;

		// get top-left and bottom-right tile position
		const rowItr = this.pixelToTileCoords(
			rect.pos.x - tileset.tilewidth,
			rect.pos.y - tileset.tileheight,
			pool.pull("Vector2d"),
		).floorSelf();
		const tileEnd = this.pixelToTileCoords(
			rect.pos.x + rect.width + tileset.tilewidth,
			rect.pos.y + rect.height + tileset.tileheight,
			pool.pull("Vector2d"),
		).ceilSelf();

		const rectEnd = this.tileToPixelCoords(
			tileEnd.x,
			tileEnd.y,
			pool.pull("Vector2d"),
		);

		// Determine the tile and pixel coordinates to start at
		const startPos = this.tileToPixelCoords(
			rowItr.x,
			rowItr.y,
			pool.pull("Vector2d"),
		);
		startPos.x -= this.hTilewidth;
		startPos.y += this.tileheight;

		/* Determine in which half of the tile the top-left corner of the area we
		 * need to draw is. If we're in the upper half, we need to start one row
		 * up due to those tiles being visible as well. How we go up one row
		 * depends on whether we're in the left or right half of the tile.
		 */
		const inUpperHalf = startPos.y - rect.pos.y > this.hTileheight;
		const inLeftHalf = rect.pos.x - startPos.x < this.hTilewidth;

		if (inUpperHalf) {
			if (inLeftHalf) {
				rowItr.x--;
				startPos.x -= this.hTilewidth;
			} else {
				rowItr.y--;
				startPos.x += this.hTilewidth;
			}
			startPos.y -= this.hTileheight;
		}

		// Determine whether the current row is shifted half a tile to the right
		let shifted = inUpperHalf ^ inLeftHalf;

		// initialize the columItr vector
		const columnItr = rowItr.clone();

		// main drawing loop
		for (
			let y = startPos.y * 2;
			y - this.tileheight * 2 < rectEnd.y * 2;
			y += this.tileheight
		) {
			columnItr.setV(rowItr);
			for (let x = startPos.x; x < rectEnd.x; x += this.tilewidth) {
				const tmxTile = layer.cellAt(columnItr.x, columnItr.y);
				// render if a valid tile position
				if (tmxTile) {
					tileset = tmxTile.tileset;
					// offset could be different per tileset
					const offset = tileset.tileoffset;
					// draw our tile
					tileset.drawTile(
						renderer,
						offset.x + x,
						offset.y + y / 2 - tileset.tileheight,
						tmxTile,
					);
				}

				// Advance to the next column
				columnItr.x++;
				columnItr.y--;
			}

			// Advance to the next row
			if (!shifted) {
				rowItr.x++;
				startPos.x += this.hTilewidth;
				shifted = true;
			} else {
				rowItr.y++;
				startPos.x -= this.hTilewidth;
				shifted = false;
			}
		}

		pool.push(columnItr);
		pool.push(rowItr);
		pool.push(tileEnd);
		pool.push(rectEnd);
		pool.push(startPos);
	}
}
