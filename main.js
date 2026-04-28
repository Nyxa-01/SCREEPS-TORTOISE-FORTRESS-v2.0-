'use strict';

const SYSTEM_GENERATION = 7; // Increment this to force global creep recycling
var DEFCON;
(function (DEFCON) {
    DEFCON["GREEN"] = "green";
    DEFCON["YELLOW"] = "yellow";
    DEFCON["ORANGE"] = "orange";
    DEFCON["RED"] = "red";
})(DEFCON || (DEFCON = {}));
const RAMPART_TARGET_HITS = {
    2: 10000,
    3: 50000,
    4: 250000,
    5: 1000000,
    6: 5000000,
    7: 25000000,
    8: 100000000,
};
const BOOST_STOCKPILE = {
    XGHO2: 3000,
    XLHO2: 3000,
    XKHO2: 3000,
    XUH2O: 3000,
    XZHO2: 3000,
};
const BUNKER_DEFENDER_BODY = [
    ...Array(12).fill(TOUGH),
    ...Array(28).fill(RANGED_ATTACK),
    ...Array(10).fill(MOVE),
];
const SAFE_MODE_POLICY = {
    hoardCharges: 3,
    rampartCriticalHits: 25000,
    triggerBodyParts: [ATTACK, RANGED_ATTACK, WORK, HEAL],
};
const MIN_RAMPART_REPAIR_ENERGY = 800;
const PATH_CACHE_TTL = 75;
const SEGMENT_FLUSH_INTERVAL = 2;
({
    emergencyHarvester: [WORK, WORK, CARRY, MOVE],
    hauler: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
    builder: [WORK, CARRY, CARRY, MOVE, MOVE],
    upgrader: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
});
const ROLE_MINIMUMS = {
    hauler: 2,
    builder: 1,
    upgrader: 1,
};
const TARGET_SEGMENTS = [0, 1];

var lzString = {exports: {}};

var hasRequiredLzString;

function requireLzString () {
	if (hasRequiredLzString) return lzString.exports;
	hasRequiredLzString = 1;
	(function (module) {
		// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
		// This work is free. You can redistribute it and/or modify it
		// under the terms of the WTFPL, Version 2
		// For more information see LICENSE.txt or http://www.wtfpl.net/
		//
		// For more information, the home page:
		// http://pieroxy.net/blog/pages/lz-string/testing.html
		//
		// LZ-based compression algorithm, version 1.4.5
		var LZString = (function() {

		// private property
		var f = String.fromCharCode;
		var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
		var baseReverseDic = {};

		function getBaseValue(alphabet, character) {
		  if (!baseReverseDic[alphabet]) {
		    baseReverseDic[alphabet] = {};
		    for (var i=0 ; i<alphabet.length ; i++) {
		      baseReverseDic[alphabet][alphabet.charAt(i)] = i;
		    }
		  }
		  return baseReverseDic[alphabet][character];
		}

		var LZString = {
		  compressToBase64 : function (input) {
		    if (input == null) return "";
		    var res = LZString._compress(input, 6, function(a){return keyStrBase64.charAt(a);});
		    switch (res.length % 4) { // To produce valid Base64
		    default: // When could this happen ?
		    case 0 : return res;
		    case 1 : return res+"===";
		    case 2 : return res+"==";
		    case 3 : return res+"=";
		    }
		  },

		  decompressFromBase64 : function (input) {
		    if (input == null) return "";
		    if (input == "") return null;
		    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrBase64, input.charAt(index)); });
		  },

		  compressToUTF16 : function (input) {
		    if (input == null) return "";
		    return LZString._compress(input, 15, function(a){return f(a+32);}) + " ";
		  },

		  decompressFromUTF16: function (compressed) {
		    if (compressed == null) return "";
		    if (compressed == "") return null;
		    return LZString._decompress(compressed.length, 16384, function(index) { return compressed.charCodeAt(index) - 32; });
		  },

		  //compress into uint8array (UCS-2 big endian format)
		  compressToUint8Array: function (uncompressed) {
		    var compressed = LZString.compress(uncompressed);
		    var buf=new Uint8Array(compressed.length*2); // 2 bytes per character

		    for (var i=0, TotalLen=compressed.length; i<TotalLen; i++) {
		      var current_value = compressed.charCodeAt(i);
		      buf[i*2] = current_value >>> 8;
		      buf[i*2+1] = current_value % 256;
		    }
		    return buf;
		  },

		  //decompress from uint8array (UCS-2 big endian format)
		  decompressFromUint8Array:function (compressed) {
		    if (compressed===null || compressed===undefined){
		        return LZString.decompress(compressed);
		    } else {
		        var buf=new Array(compressed.length/2); // 2 bytes per character
		        for (var i=0, TotalLen=buf.length; i<TotalLen; i++) {
		          buf[i]=compressed[i*2]*256+compressed[i*2+1];
		        }

		        var result = [];
		        buf.forEach(function (c) {
		          result.push(f(c));
		        });
		        return LZString.decompress(result.join(''));

		    }

		  },


		  //compress into a string that is already URI encoded
		  compressToEncodedURIComponent: function (input) {
		    if (input == null) return "";
		    return LZString._compress(input, 6, function(a){return keyStrUriSafe.charAt(a);});
		  },

		  //decompress from an output of compressToEncodedURIComponent
		  decompressFromEncodedURIComponent:function (input) {
		    if (input == null) return "";
		    if (input == "") return null;
		    input = input.replace(/ /g, "+");
		    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrUriSafe, input.charAt(index)); });
		  },

		  compress: function (uncompressed) {
		    return LZString._compress(uncompressed, 16, function(a){return f(a);});
		  },
		  _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
		    if (uncompressed == null) return "";
		    var i, value,
		        context_dictionary= {},
		        context_dictionaryToCreate= {},
		        context_c="",
		        context_wc="",
		        context_w="",
		        context_enlargeIn= 2, // Compensate for the first entry which should not count
		        context_dictSize= 3,
		        context_numBits= 2,
		        context_data=[],
		        context_data_val=0,
		        context_data_position=0,
		        ii;

		    for (ii = 0; ii < uncompressed.length; ii += 1) {
		      context_c = uncompressed.charAt(ii);
		      if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
		        context_dictionary[context_c] = context_dictSize++;
		        context_dictionaryToCreate[context_c] = true;
		      }

		      context_wc = context_w + context_c;
		      if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
		        context_w = context_wc;
		      } else {
		        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
		          if (context_w.charCodeAt(0)<256) {
		            for (i=0 ; i<context_numBits ; i++) {
		              context_data_val = (context_data_val << 1);
		              if (context_data_position == bitsPerChar-1) {
		                context_data_position = 0;
		                context_data.push(getCharFromInt(context_data_val));
		                context_data_val = 0;
		              } else {
		                context_data_position++;
		              }
		            }
		            value = context_w.charCodeAt(0);
		            for (i=0 ; i<8 ; i++) {
		              context_data_val = (context_data_val << 1) | (value&1);
		              if (context_data_position == bitsPerChar-1) {
		                context_data_position = 0;
		                context_data.push(getCharFromInt(context_data_val));
		                context_data_val = 0;
		              } else {
		                context_data_position++;
		              }
		              value = value >> 1;
		            }
		          } else {
		            value = 1;
		            for (i=0 ; i<context_numBits ; i++) {
		              context_data_val = (context_data_val << 1) | value;
		              if (context_data_position ==bitsPerChar-1) {
		                context_data_position = 0;
		                context_data.push(getCharFromInt(context_data_val));
		                context_data_val = 0;
		              } else {
		                context_data_position++;
		              }
		              value = 0;
		            }
		            value = context_w.charCodeAt(0);
		            for (i=0 ; i<16 ; i++) {
		              context_data_val = (context_data_val << 1) | (value&1);
		              if (context_data_position == bitsPerChar-1) {
		                context_data_position = 0;
		                context_data.push(getCharFromInt(context_data_val));
		                context_data_val = 0;
		              } else {
		                context_data_position++;
		              }
		              value = value >> 1;
		            }
		          }
		          context_enlargeIn--;
		          if (context_enlargeIn == 0) {
		            context_enlargeIn = Math.pow(2, context_numBits);
		            context_numBits++;
		          }
		          delete context_dictionaryToCreate[context_w];
		        } else {
		          value = context_dictionary[context_w];
		          for (i=0 ; i<context_numBits ; i++) {
		            context_data_val = (context_data_val << 1) | (value&1);
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		            value = value >> 1;
		          }


		        }
		        context_enlargeIn--;
		        if (context_enlargeIn == 0) {
		          context_enlargeIn = Math.pow(2, context_numBits);
		          context_numBits++;
		        }
		        // Add wc to the dictionary.
		        context_dictionary[context_wc] = context_dictSize++;
		        context_w = String(context_c);
		      }
		    }

		    // Output the code for w.
		    if (context_w !== "") {
		      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
		        if (context_w.charCodeAt(0)<256) {
		          for (i=0 ; i<context_numBits ; i++) {
		            context_data_val = (context_data_val << 1);
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		          }
		          value = context_w.charCodeAt(0);
		          for (i=0 ; i<8 ; i++) {
		            context_data_val = (context_data_val << 1) | (value&1);
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		            value = value >> 1;
		          }
		        } else {
		          value = 1;
		          for (i=0 ; i<context_numBits ; i++) {
		            context_data_val = (context_data_val << 1) | value;
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		            value = 0;
		          }
		          value = context_w.charCodeAt(0);
		          for (i=0 ; i<16 ; i++) {
		            context_data_val = (context_data_val << 1) | (value&1);
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		            value = value >> 1;
		          }
		        }
		        context_enlargeIn--;
		        if (context_enlargeIn == 0) {
		          context_enlargeIn = Math.pow(2, context_numBits);
		          context_numBits++;
		        }
		        delete context_dictionaryToCreate[context_w];
		      } else {
		        value = context_dictionary[context_w];
		        for (i=0 ; i<context_numBits ; i++) {
		          context_data_val = (context_data_val << 1) | (value&1);
		          if (context_data_position == bitsPerChar-1) {
		            context_data_position = 0;
		            context_data.push(getCharFromInt(context_data_val));
		            context_data_val = 0;
		          } else {
		            context_data_position++;
		          }
		          value = value >> 1;
		        }


		      }
		      context_enlargeIn--;
		      if (context_enlargeIn == 0) {
		        context_enlargeIn = Math.pow(2, context_numBits);
		        context_numBits++;
		      }
		    }

		    // Mark the end of the stream
		    value = 2;
		    for (i=0 ; i<context_numBits ; i++) {
		      context_data_val = (context_data_val << 1) | (value&1);
		      if (context_data_position == bitsPerChar-1) {
		        context_data_position = 0;
		        context_data.push(getCharFromInt(context_data_val));
		        context_data_val = 0;
		      } else {
		        context_data_position++;
		      }
		      value = value >> 1;
		    }

		    // Flush the last char
		    while (true) {
		      context_data_val = (context_data_val << 1);
		      if (context_data_position == bitsPerChar-1) {
		        context_data.push(getCharFromInt(context_data_val));
		        break;
		      }
		      else context_data_position++;
		    }
		    return context_data.join('');
		  },

		  decompress: function (compressed) {
		    if (compressed == null) return "";
		    if (compressed == "") return null;
		    return LZString._decompress(compressed.length, 32768, function(index) { return compressed.charCodeAt(index); });
		  },

		  _decompress: function (length, resetValue, getNextValue) {
		    var dictionary = [],
		        enlargeIn = 4,
		        dictSize = 4,
		        numBits = 3,
		        entry = "",
		        result = [],
		        i,
		        w,
		        bits, resb, maxpower, power,
		        c,
		        data = {val:getNextValue(0), position:resetValue, index:1};

		    for (i = 0; i < 3; i += 1) {
		      dictionary[i] = i;
		    }

		    bits = 0;
		    maxpower = Math.pow(2,2);
		    power=1;
		    while (power!=maxpower) {
		      resb = data.val & data.position;
		      data.position >>= 1;
		      if (data.position == 0) {
		        data.position = resetValue;
		        data.val = getNextValue(data.index++);
		      }
		      bits |= (resb>0 ? 1 : 0) * power;
		      power <<= 1;
		    }

		    switch (bits) {
		      case 0:
		          bits = 0;
		          maxpower = Math.pow(2,8);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
		            power <<= 1;
		          }
		        c = f(bits);
		        break;
		      case 1:
		          bits = 0;
		          maxpower = Math.pow(2,16);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
		            power <<= 1;
		          }
		        c = f(bits);
		        break;
		      case 2:
		        return "";
		    }
		    dictionary[3] = c;
		    w = c;
		    result.push(c);
		    while (true) {
		      if (data.index > length) {
		        return "";
		      }

		      bits = 0;
		      maxpower = Math.pow(2,numBits);
		      power=1;
		      while (power!=maxpower) {
		        resb = data.val & data.position;
		        data.position >>= 1;
		        if (data.position == 0) {
		          data.position = resetValue;
		          data.val = getNextValue(data.index++);
		        }
		        bits |= (resb>0 ? 1 : 0) * power;
		        power <<= 1;
		      }

		      switch (c = bits) {
		        case 0:
		          bits = 0;
		          maxpower = Math.pow(2,8);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
		            power <<= 1;
		          }

		          dictionary[dictSize++] = f(bits);
		          c = dictSize-1;
		          enlargeIn--;
		          break;
		        case 1:
		          bits = 0;
		          maxpower = Math.pow(2,16);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
		            power <<= 1;
		          }
		          dictionary[dictSize++] = f(bits);
		          c = dictSize-1;
		          enlargeIn--;
		          break;
		        case 2:
		          return result.join('');
		      }

		      if (enlargeIn == 0) {
		        enlargeIn = Math.pow(2, numBits);
		        numBits++;
		      }

		      if (dictionary[c]) {
		        entry = dictionary[c];
		      } else {
		        if (c === dictSize) {
		          entry = w + w.charAt(0);
		        } else {
		          return null;
		        }
		      }
		      result.push(entry);

		      // Add w+entry[0] to the dictionary.
		      dictionary[dictSize++] = w + entry.charAt(0);
		      enlargeIn--;

		      w = entry;

		      if (enlargeIn == 0) {
		        enlargeIn = Math.pow(2, numBits);
		        numBits++;
		      }

		    }
		  }
		};
		  return LZString;
		})();

		if( module != null ) {
		  module.exports = LZString;
		} else if( typeof angular !== 'undefined' && angular != null ) {
		  angular.module('LZString', [])
		  .factory('LZString', function () {
		    return LZString;
		  });
		} 
	} (lzString));
	return lzString.exports;
}

var lzStringExports = requireLzString();

var SegmentId;
(function (SegmentId) {
    SegmentId[SegmentId["Stats"] = 0] = "Stats";
    SegmentId[SegmentId["CostMatrices"] = 1] = "CostMatrices";
})(SegmentId || (SegmentId = {}));
const cache = {
    [SegmentId.Stats]: { history: [] },
    [SegmentId.CostMatrices]: { rooms: {} },
};
const dirtySegments = new Set();
function deserializeSegment(segmentId, fallback) {
    const raw = RawMemory.segments[segmentId];
    if (typeof raw !== 'string' || raw.length === 0) {
        return fallback;
    }
    const inflated = lzStringExports.decompressFromUTF16(raw) ?? raw;
    try {
        return JSON.parse(inflated);
    }
    catch (error) {
        throw new Error(`Segment ${segmentId} corrupted: ${error}`);
    }
}
function serializeSegment(payload) {
    return lzStringExports.compressToUTF16(JSON.stringify(payload));
}
function markDirty(segmentId) {
    dirtySegments.add(segmentId);
}
const SegmentManager = {
    preTick() {
        RawMemory.setActiveSegments([...TARGET_SEGMENTS]);
        if (RawMemory.segments[SegmentId.Stats] !== undefined) {
            cache[SegmentId.Stats] = deserializeSegment(SegmentId.Stats, { history: [] });
        }
        if (RawMemory.segments[SegmentId.CostMatrices] !== undefined) {
            cache[SegmentId.CostMatrices] = deserializeSegment(SegmentId.CostMatrices, { rooms: {} });
        }
    },
    postTick() {
        RawMemory.setActiveSegments([...TARGET_SEGMENTS]);
        if (dirtySegments.size === 0) {
            return;
        }
        const pending = [...dirtySegments];
        const flushNow = Game.time % SEGMENT_FLUSH_INTERVAL === 0 ? pending : pending.slice(0, 1);
        for (const segmentId of flushNow) {
            RawMemory.segments[segmentId] = serializeSegment(cache[segmentId]);
            dirtySegments.delete(segmentId);
        }
    },
    appendStats(snapshot) {
        const history = cache[SegmentId.Stats].history;
        history.push(snapshot);
        while (history.length > 250) {
            history.shift();
        }
        markDirty(SegmentId.Stats);
    },
    getStatsHistory() {
        return cache[SegmentId.Stats].history;
    },
    getCostMatrix(roomName) {
        return cache[SegmentId.CostMatrices].rooms[roomName]?.data;
    },
    setCostMatrix(roomName, data) {
        cache[SegmentId.CostMatrices].rooms[roomName] = {
            tick: Game.time,
            data,
        };
        markDirty(SegmentId.CostMatrices);
    },
    pruneCostMatrices(ttl = 500) {
        const rooms = cache[SegmentId.CostMatrices].rooms;
        for (const [roomName, record] of Object.entries(rooms)) {
            if (Game.time - record.tick > ttl) {
                delete rooms[roomName];
                markDirty(SegmentId.CostMatrices);
            }
        }
    },
};

function resolveTarget(target) {
    return 'pos' in target ? target.pos : target;
}
class PathingService {
    static moveTo(creep, target, range = 1) {
        const targetPos = resolveTarget(target);
        if (creep.pos.inRangeTo(targetPos, range)) {
            return OK;
        }
        const search = PathFinder.search(creep.pos, {
            pos: targetPos,
            range,
        }, {
            plainCost: 2,
            swampCost: 10,
            maxOps: 8000,
            roomCallback: (roomName) => this.getCostMatrix(roomName),
        });
        const nextStep = search.path[0];
        if (!nextStep) {
            return ERR_NO_PATH;
        }
        creep.memory.w = search.path.slice(0, 12).map((position) => `${position.roomName}:${position.x}:${position.y}`);
        const direction = creep.pos.getDirectionTo(nextStep);
        // Traffic Evasion: If an allied creep is on the next step, command it to swap places
        const blockingCreep = nextStep.lookFor(LOOK_CREEPS)[0];
        if (blockingCreep && blockingCreep.my) {
            blockingCreep.move(nextStep.getDirectionTo(creep.pos));
        }
        return creep.move(direction);
    }
    static getCostMatrix(roomName) {
        const cached = this.matrixCache.get(roomName);
        if (cached && Game.time - cached.tick <= PATH_CACHE_TTL) {
            return cached.matrix;
        }
        const serialized = SegmentManager.getCostMatrix(roomName);
        if (serialized) {
            const matrix = PathFinder.CostMatrix.deserialize(serialized);
            this.matrixCache.set(roomName, { tick: Game.time, matrix });
            return matrix;
        }
        const room = Game.rooms[roomName];
        if (!room) {
            return false;
        }
        const matrix = this.buildCostMatrix(room);
        this.matrixCache.set(roomName, { tick: Game.time, matrix });
        SegmentManager.setCostMatrix(roomName, matrix.serialize());
        return matrix;
    }
    static buildCostMatrix(room) {
        const matrix = new PathFinder.CostMatrix();
        for (const structure of room.find(FIND_STRUCTURES)) {
            if (structure.structureType === STRUCTURE_ROAD) {
                matrix.set(structure.pos.x, structure.pos.y, 1);
                continue;
            }
            if (structure.structureType === STRUCTURE_CONTAINER) {
                continue;
            }
            if (structure.structureType === STRUCTURE_RAMPART && structure.my) {
                continue;
            }
            if (structure.structureType !== STRUCTURE_CONTROLLER) {
                matrix.set(structure.pos.x, structure.pos.y, 255);
            }
        }
        for (const site of room.find(FIND_CONSTRUCTION_SITES)) {
            if (site.structureType !== STRUCTURE_CONTAINER &&
                site.structureType !== STRUCTURE_ROAD &&
                site.structureType !== STRUCTURE_RAMPART) {
                matrix.set(site.pos.x, site.pos.y, 255);
            }
        }
        return matrix;
    }
}
PathingService.matrixCache = new Map();

class Selector {
    constructor(children) {
        this.children = children;
    }
    run(context) {
        for (const child of this.children) {
            if (child.run(context)) {
                return true;
            }
        }
        return false;
    }
}

class Sequence {
    constructor(children) {
        this.children = children;
    }
    run(context) {
        for (const child of this.children) {
            if (!child.run(context)) {
                return false;
            }
        }
        return true;
    }
}

class FnTask {
    constructor(fn) {
        this.fn = fn;
    }
    run(context) {
        return this.fn(context);
    }
}

class BuilderBehavior {
    run(creep, colony) {
        this.syncState(creep);
        const behavior = new Selector([
            new Sequence([
                new FnTask(({ creep: activeCreep }) => activeCreep.memory.s === 'work'),
                new FnTask(({ creep: activeCreep, colony: activeColony }) => this.buildStructures(activeCreep, activeColony)),
            ]),
            new FnTask(({ creep: activeCreep, colony: activeColony }) => this.collectEnergy(activeCreep, activeColony)),
        ]);
        const handled = behavior.run({ creep, colony });
        this.syncState(creep);
        return handled;
    }
    syncState(creep) {
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'load';
        }
        else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'work';
        }
    }
    collectEnergy(creep, colony) {
        const target = colony.logisticsManager.getEnergySource(creep);
        if (!target)
            return false;
        if (!creep.pos.isNearTo(target)) {
            PathingService.moveTo(creep, target, 1);
            return true;
        }
        if ('resourceType' in target)
            return creep.pickup(target) === OK;
        if ('store' in target)
            return creep.withdraw(target, RESOURCE_ENERGY) === OK;
        return creep.harvest(target) === OK;
    }
    buildStructures(creep, colony) {
        const room = colony.room;
        if (!room)
            return false;
        const target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
        if (!target)
            return false;
        if (!creep.pos.inRangeTo(target, 3)) {
            PathingService.moveTo(creep, target, 3);
            return true;
        }
        return creep.build(target) === OK;
    }
}

class HarvesterBehavior {
    run(creep, colony) {
        this.syncState(creep);
        const behavior = new Selector([
            new Sequence([
                new FnTask(({ creep: activeCreep }) => activeCreep.memory.s === 'work'),
                new FnTask(({ creep: activeCreep, colony: activeColony }) => this.deliverEnergy(activeCreep, activeColony)),
            ]),
            new FnTask(({ creep: activeCreep, colony: activeColony }) => activeColony.room ? this.harvestEnergy(activeCreep, activeColony.room) : false),
        ]);
        const handled = behavior.run({ creep, colony });
        this.syncState(creep);
        return handled;
    }
    syncState(creep) {
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'load';
        }
        else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'work';
        }
    }
    deliverEnergy(creep, colony) {
        const nearbyHauler = creep.pos.findInRange(FIND_MY_CREEPS, 1, {
            filter: (candidate) => candidate.memory.r === 'hauler' &&
                candidate.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
        })[0];
        if (nearbyHauler) {
            creep.transfer(nearbyHauler, RESOURCE_ENERGY);
            return true;
        }
        const target = colony.logisticsManager.getFillTarget(creep) ?? colony.room?.storage;
        if (!target) {
            return false;
        }
        if (!creep.pos.isNearTo(target)) {
            PathingService.moveTo(creep, target, 1);
            return true;
        }
        const result = creep.transfer(target, RESOURCE_ENERGY);
        return result === OK || result === ERR_FULL;
    }
    harvestEnergy(creep, room) {
        const sources = room.find(FIND_SOURCES);
        if (sources.length === 0)
            return false;
        if (!creep.memory.t) {
            const nameParts = creep.name.split('-');
            const uid = parseInt(nameParts[nameParts.length - 1] ?? '0', 10) || 0;
            creep.memory.t = sources[uid % sources.length].id;
        }
        let source = Game.getObjectById(creep.memory.t);
        if (!source || (source.energy === 0 && source.ticksToRegeneration > 0)) {
            source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        }
        if (!source)
            return false;
        if (!creep.pos.isNearTo(source)) {
            PathingService.moveTo(creep, source.pos, 1);
            return true;
        }
        return creep.harvest(source) === OK;
    }
}

class HaulerBehavior {
    run(creep, colony) {
        this.syncState(creep);
        const behavior = new Selector([
            new Sequence([
                new FnTask(({ creep: activeCreep }) => activeCreep.memory.s === 'work'),
                new FnTask(({ creep: activeCreep, colony: activeColony }) => this.deliverEnergy(activeCreep, activeColony)),
            ]),
            new FnTask(({ creep: activeCreep, colony: activeColony }) => this.collectEnergy(activeCreep, activeColony)),
        ]);
        const handled = behavior.run({ creep, colony });
        this.syncState(creep);
        return handled;
    }
    syncState(creep) {
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'load';
        }
        else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'work';
        }
    }
    deliverEnergy(creep, colony) {
        let target = colony.logisticsManager.getFillTarget(creep);
        if (!target) {
            target = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
                filter: (candidate) => (candidate.name.includes('upgrader') || candidate.name.includes('builder')) &&
                    candidate.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
            }) ?? undefined;
        }
        if (!target) {
            return false;
        }
        if (!creep.pos.isNearTo(target)) {
            PathingService.moveTo(creep, target, 1);
            return true;
        }
        const result = creep.transfer(target, RESOURCE_ENERGY);
        return result === OK || result === ERR_FULL;
    }
    collectEnergy(creep, colony) {
        const provider = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
            filter: (candidate) => candidate.memory.r === 'emergencyHarvester' &&
                candidate.store.getUsedCapacity(RESOURCE_ENERGY) > 20,
        });
        if (provider) {
            if (!creep.pos.isNearTo(provider)) {
                PathingService.moveTo(creep, provider.pos, 1);
                return true;
            }
            return true;
        }
        const source = colony.logisticsManager.getEnergySource(creep);
        if (!source) {
            return false;
        }
        if (!creep.pos.isNearTo(source)) {
            PathingService.moveTo(creep, source, 1);
            return true;
        }
        return this.withdrawFromTarget(creep, source);
    }
    withdrawFromTarget(creep, target) {
        if ('resourceType' in target) {
            return creep.pickup(target) === OK;
        }
        if ('store' in target) {
            return creep.withdraw(target, RESOURCE_ENERGY) === OK;
        }
        return creep.harvest(target) === OK;
    }
}

class UpgraderBehavior {
    run(creep, colony) {
        this.syncState(creep);
        const behavior = new Selector([
            new Sequence([
                new FnTask(({ creep: activeCreep }) => activeCreep.memory.s === 'work'),
                new FnTask(({ creep: activeCreep, colony: activeColony }) => this.upgradeController(activeCreep, activeColony)),
            ]),
            new FnTask(({ creep: activeCreep, colony: activeColony }) => this.collectEnergy(activeCreep, activeColony)),
        ]);
        const handled = behavior.run({ creep, colony });
        this.syncState(creep);
        return handled;
    }
    syncState(creep) {
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'load';
        }
        else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'work';
        }
    }
    collectEnergy(creep, colony) {
        const target = colony.logisticsManager.getEnergySource(creep);
        if (!target) {
            return false;
        }
        if (!creep.pos.isNearTo(target)) {
            PathingService.moveTo(creep, target, 1);
            return true;
        }
        if ('resourceType' in target) {
            return creep.pickup(target) === OK;
        }
        if ('store' in target) {
            return creep.withdraw(target, RESOURCE_ENERGY) === OK;
        }
        return creep.harvest(target) === OK;
    }
    upgradeController(creep, colony) {
        const controller = colony.upgradeManager.getTarget();
        if (!controller) {
            return false;
        }
        if (!creep.pos.inRangeTo(controller, 3)) {
            PathingService.moveTo(creep, controller, 3);
            return true;
        }
        return creep.upgradeController(controller) === OK;
    }
}

class DefenderBehavior {
    run(creep, colony) {
        if (this.handleBoosting(creep)) {
            return true;
        }
        const target = colony.defenseManager.getDefenderTarget(creep);
        if (!target) {
            const rallyPoint = colony.getPrimarySpawn() ?? colony.room?.controller;
            if (rallyPoint && !creep.pos.inRangeTo(rallyPoint, 3)) {
                PathingService.moveTo(creep, rallyPoint, 3);
                return true;
            }
            return false;
        }
        const rampart = this.getBestRampart(colony, target, creep);
        if (rampart && !creep.pos.isEqualTo(rampart.pos)) {
            PathingService.moveTo(creep, rampart, 0);
            return true;
        }
        if (creep.pos.getRangeTo(target) > 3) {
            PathingService.moveTo(creep, target, 3);
            return true;
        }
        if (creep.pos.getRangeTo(target) <= 1 && creep.rangedMassAttack() === OK) {
            return true;
        }
        return creep.rangedAttack(target) === OK;
    }
    handleBoosting(creep) {
        const boostRequest = creep.memory.b;
        if (!boostRequest || boostRequest.done) {
            return false;
        }
        const lab = Game.getObjectById(boostRequest.labId);
        if (!lab) {
            creep.memory.b = { ...boostRequest, done: true };
            return false;
        }
        if (!creep.pos.isNearTo(lab)) {
            PathingService.moveTo(creep, lab, 1);
            return true;
        }
        const result = lab.boostCreep(creep);
        if (result === OK || result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_NOT_FOUND) {
            creep.memory.b = { ...boostRequest, done: true };
        }
        return true;
    }
    getBestRampart(colony, target, creep) {
        const room = colony.room;
        if (!room) {
            return undefined;
        }
        const ramparts = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_RAMPART && structure.pos.inRangeTo(target, 3),
        });
        ramparts.sort((left, right) => creep.pos.getRangeTo(left) - creep.pos.getRangeTo(right));
        return ramparts[0];
    }
}

class ConstructionManager {
    constructor(colony) {
        this.colony = colony;
    }
    init() { }
    run() {
        const room = this.colony.room;
        const controllerLevel = room?.controller?.level ?? 0;
        if (!room || controllerLevel < 2 || room.find(FIND_MY_CONSTRUCTION_SITES).length >= 5) {
            return;
        }
        const bunkerTargets = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_SPAWN ||
                structure.structureType === STRUCTURE_STORAGE ||
                structure.structureType === STRUCTURE_TERMINAL ||
                structure.structureType === STRUCTURE_TOWER,
        });
        for (const structure of bunkerTargets) {
            const hasRampart = structure.pos
                .lookFor(LOOK_STRUCTURES)
                .some((candidate) => candidate.structureType === STRUCTURE_RAMPART);
            if (!hasRampart) {
                structure.pos.createConstructionSite(STRUCTURE_RAMPART);
                return;
            }
        }
    }
    getRepairTarget() {
        const room = this.colony.room;
        const controllerLevel = room?.controller?.level ?? 0;
        if (!room || controllerLevel < 2) {
            return undefined;
        }
        const targetHits = RAMPART_TARGET_HITS[controllerLevel] ?? RAMPART_TARGET_HITS[8];
        const fortifications = room.find(FIND_STRUCTURES, {
            filter: (structure) => (structure.structureType === STRUCTURE_RAMPART || structure.structureType === STRUCTURE_WALL) &&
                structure.hits < targetHits,
        });
        fortifications.sort((left, right) => left.hits - right.hits);
        return fortifications[0];
    }
}

const Mem = {
    ensureRoots() {
        var _a;
        Memory._v ?? (Memory._v = 1);
        Memory._seg ?? (Memory._seg = { v: 1, l: Game.time });
        Memory.creeps ?? (Memory.creeps = {});
        Memory.rooms ?? (Memory.rooms = {});
        Memory.colonies ?? (Memory.colonies = {});
        Memory.stats ?? (Memory.stats = {});
        (_a = Memory.stats).bt ?? (_a.bt = "main");
    },
    pruneDeadCreeps() {
        this.ensureRoots();
        for (const creepName of Object.keys(Memory.creeps)) {
            if (!(creepName in Game.creeps)) {
                delete Memory.creeps[creepName];
            }
        }
    },
    getColony(roomName) {
        var _a;
        this.ensureRoots();
        (_a = Memory.colonies)[roomName] ?? (_a[roomName] = { d: DEFCON.GREEN, q: 0 });
        return Memory.colonies[roomName];
    },
    nextUid() {
        this.ensureRoots();
        const next = (Memory.stats?.uid ?? 0) + 1;
        if (Memory.stats) {
            Memory.stats.uid = next;
        }
        return next;
    },
};

function isNearRoomEdge(position, distance = 3) {
    return (position.x <= distance ||
        position.x >= 49 - distance ||
        position.y <= distance ||
        position.y >= 49 - distance);
}

class DefenseManager {
    constructor(colony) {
        this.colony = colony;
        this.hostiles = [];
        this.edgeDanceHostiles = [];
        this.rankedTargets = [];
        this.snapshot = {
            defcon: DEFCON.GREEN,
            hostileCount: 0,
        };
    }
    init() {
        this.refresh();
    }
    run() {
        this.refresh();
        this.runTowers();
        this.maybeTriggerSafeMode();
    }
    getSnapshot() {
        return this.snapshot;
    }
    getHostiles() {
        return this.hostiles;
    }
    getEdgeDanceTargets() {
        return this.edgeDanceHostiles;
    }
    getRequiredDefenderCount() {
        if (this.snapshot.defcon === DEFCON.RED) {
            return Math.max(2, this.rankedTargets.length);
        }
        if (this.snapshot.defcon === DEFCON.ORANGE) {
            return Math.max(1, this.rankedTargets.length);
        }
        return 0;
    }
    getDefenderTarget(creep) {
        return this.rankedTargets[0]?.hostile ?? this.hostiles[0];
    }
    static isEdgeDanceTarget(position) {
        return isNearRoomEdge(position, 3);
    }
    static getThreatPriority(hostile) {
        return (hostile.getActiveBodyparts(HEAL) * 1000 +
            hostile.getActiveBodyparts(RANGED_ATTACK) * 100 +
            hostile.getActiveBodyparts(ATTACK) * 10 +
            hostile.getActiveBodyparts(WORK));
    }
    static calculateNetDamage(towers, hostile, hostiles) {
        const towerDamage = towers.reduce((total, tower) => total + DefenseManager.getTowerDamageAtRange(tower.pos.getRangeTo(hostile)), 0);
        return towerDamage - DefenseManager.getHostileHealing(hostile, hostiles);
    }
    static getTowerDamageAtRange(range) {
        if (range <= TOWER_OPTIMAL_RANGE) {
            return TOWER_POWER_ATTACK;
        }
        if (range >= TOWER_FALLOFF_RANGE) {
            return Math.floor(TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF));
        }
        const falloffRatio = (range - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
        return Math.floor(TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF * falloffRatio));
    }
    static getHostileHealing(target, hostiles) {
        let totalHealing = 0;
        for (const hostile of hostiles) {
            const range = hostile.pos.getRangeTo(target);
            if (range > 3) {
                continue;
            }
            for (const part of hostile.body) {
                if (part.type !== HEAL || part.hits <= 0) {
                    continue;
                }
                const basePower = range <= 1 ? HEAL_POWER : RANGED_HEAL_POWER;
                const boostMultiplier = part.boost && BOOSTS[HEAL][part.boost]
                    ? BOOSTS[HEAL][part.boost].heal ?? 1
                    : 1;
                totalHealing += basePower * boostMultiplier;
            }
        }
        return totalHealing;
    }
    refresh() {
        const room = this.colony.room;
        if (!room) {
            this.hostiles = [];
            this.edgeDanceHostiles = [];
            this.rankedTargets = [];
            this.snapshot = { defcon: DEFCON.GREEN, hostileCount: 0 };
            return;
        }
        this.hostiles = room.find(FIND_HOSTILE_CREEPS);
        this.edgeDanceHostiles = this.hostiles.filter((hostile) => DefenseManager.isEdgeDanceTarget(hostile.pos));
        const towers = this.getTowers();
        this.rankedTargets = this.hostiles
            .filter((hostile) => !DefenseManager.isEdgeDanceTarget(hostile.pos))
            .map((hostile) => ({
            hostile,
            netDamage: DefenseManager.calculateNetDamage(towers, hostile, this.hostiles),
            threat: DefenseManager.getThreatPriority(hostile),
        }))
            .filter((target) => target.netDamage > 0 || towers.length === 0)
            .sort((left, right) => {
            if (left.threat !== right.threat) {
                return right.threat - left.threat;
            }
            if (left.netDamage !== right.netDamage) {
                return right.netDamage - left.netDamage;
            }
            return left.hostile.hits - right.hostile.hits;
        });
        const defcon = this.getDefconLevel();
        this.snapshot = {
            defcon,
            hostileCount: this.hostiles.length,
            focusTargetId: this.rankedTargets[0]?.hostile.id,
        };
        const colonyMemory = Mem.getColony(this.colony.name);
        colonyMemory.d = defcon;
        colonyMemory.f = this.snapshot.focusTargetId;
    }
    runTowers() {
        const towers = this.getTowers();
        if (towers.length === 0) {
            return;
        }
        const focusTarget = this.rankedTargets[0]?.hostile;
        if (focusTarget) {
            for (const tower of towers) {
                tower.attack(focusTarget);
            }
            return;
        }
        const totalTowerEnergy = towers.reduce((total, tower) => total + tower.store.getUsedCapacity(RESOURCE_ENERGY), 0);
        const repairTarget = this.colony.constructionManager.getRepairTarget();
        if (repairTarget &&
            totalTowerEnergy > MIN_RAMPART_REPAIR_ENERGY &&
            repairTarget.hits < SAFE_MODE_POLICY.rampartCriticalHits) {
            for (const tower of towers) {
                tower.repair(repairTarget);
            }
        }
    }
    maybeTriggerSafeMode() {
        const room = this.colony.room;
        const controller = room?.controller;
        if (!room || !controller?.my || controller.safeMode || (controller.safeModeAvailable ?? 0) <= 0) {
            return;
        }
        const breachDetected = this.hostiles.some((hostile) => this.isConfirmedPlayerBreach(hostile));
        if (!breachDetected) {
            return;
        }
        const spawnsUnderImmediateThreat = room.find(FIND_MY_SPAWNS).some((spawn) => this.hostiles.some((hostile) => hostile.pos.getRangeTo(spawn) <= 5));
        if (spawnsUnderImmediateThreat ||
            (controller.safeModeAvailable ?? 0) > SAFE_MODE_POLICY.hoardCharges) {
            controller.activateSafeMode();
        }
    }
    isConfirmedPlayerBreach(hostile) {
        if (hostile.owner.username === 'Invader' || hostile.owner.username === 'Source Keeper') {
            return false;
        }
        if (DefenseManager.isEdgeDanceTarget(hostile.pos)) {
            return false;
        }
        const canBreach = SAFE_MODE_POLICY.triggerBodyParts.some((part) => hostile.getActiveBodyparts(part) > 0);
        if (!canBreach) {
            return false;
        }
        const protectedByRampart = hostile.pos.lookFor(LOOK_STRUCTURES).some((structure) => {
            return structure.structureType === STRUCTURE_RAMPART && structure.my;
        });
        return !protectedByRampart;
    }
    getDefconLevel() {
        if (this.hostiles.length === 0) {
            return DEFCON.GREEN;
        }
        if (this.hostiles.some((hostile) => this.isConfirmedPlayerBreach(hostile))) {
            return DEFCON.RED;
        }
        if (this.rankedTargets.length > 0 || this.edgeDanceHostiles.length > 0) {
            return DEFCON.ORANGE;
        }
        return DEFCON.YELLOW;
    }
    getTowers() {
        const room = this.colony.room;
        if (!room) {
            return [];
        }
        return room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_TOWER,
        });
    }
}

class LogisticsManager {
    constructor(colony) {
        this.colony = colony;
    }
    init() { }
    run() { }
    getFillTarget(creep) {
        const room = this.colony.room;
        if (!room) {
            return undefined;
        }
        const safeModeActive = (room.controller?.safeMode ?? 0) > 0;
        const defenseActive = !safeModeActive && this.colony.defenseManager.getSnapshot().hostileCount > 0;
        const energyStructures = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => {
                if (structure.structureType !== STRUCTURE_EXTENSION &&
                    structure.structureType !== STRUCTURE_SPAWN &&
                    structure.structureType !== STRUCTURE_TOWER) {
                    return false;
                }
                return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            },
        });
        energyStructures.sort((left, right) => {
            const leftPriority = defenseActive && left.structureType === STRUCTURE_TOWER ? 0 : 1;
            const rightPriority = defenseActive && right.structureType === STRUCTURE_TOWER ? 0 : 1;
            if (leftPriority !== rightPriority) {
                return leftPriority - rightPriority;
            }
            return creep.pos.getRangeTo(left) - creep.pos.getRangeTo(right);
        });
        if (energyStructures[0]) {
            return energyStructures[0];
        }
        if ((room.storage?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
            return room.storage;
        }
        if ((room.terminal?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
            return room.terminal;
        }
        const containers = room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_CONTAINER &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
        });
        return creep.pos.findClosestByPath(containers) ?? containers[0];
    }
    getEnergySource(creep) {
        const room = this.colony.room;
        if (!room) {
            return undefined;
        }
        const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: (resource) => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50,
        });
        if (droppedEnergy) {
            return droppedEnergy;
        }
        const tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
            filter: (candidate) => candidate.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
        });
        if (tombstone) {
            return tombstone;
        }
        const ruin = creep.pos.findClosestByPath(FIND_RUINS, {
            filter: (candidate) => candidate.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
        });
        if (ruin) {
            return ruin;
        }
        if ((room.storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
            return room.storage;
        }
        if ((room.terminal?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
            return room.terminal;
        }
        const containers = room.find(FIND_STRUCTURES, {
            filter: (structure) => (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_LINK) &&
                structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
        });
        const storedEnergy = creep.pos.findClosestByPath(containers) ?? containers[0];
        if (storedEnergy) {
            return storedEnergy;
        }
        // Saturation Bypass: Prevent RCL 1 deadlock by allowing workers to tap full spawns
        if (creep.name.includes('upgrader') || creep.name.includes('builder')) {
            const saturatedSpawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS, {
                filter: (s) => s.store.getUsedCapacity(RESOURCE_ENERGY) >= 250,
            });
            if (saturatedSpawn)
                return saturatedSpawn;
        }
        return creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE) ?? undefined;
    }
}

function getBodyCost(body) {
    return body.reduce((total, part) => total + BODYPART_COST[part], 0);
}
function buildRepeatedBody(pattern, maxEnergy, minRepeats = 1, maxParts = 50) {
    const patternCost = getBodyCost(pattern);
    if (patternCost === 0 || pattern.length === 0) {
        return [];
    }
    const repeatLimit = Math.floor(maxParts / pattern.length);
    const maxRepeats = Math.min(Math.floor(maxEnergy / patternCost), repeatLimit);
    if (maxRepeats < minRepeats) {
        return pattern.slice(0, Math.min(pattern.length, maxParts));
    }
    return Array.from({ length: maxRepeats }, () => [...pattern]).flat();
}

const EMERGENCY_HARVESTER_PATTERN = [WORK, CARRY, MOVE];
const HAULER_PATTERN = [CARRY, CARRY, MOVE];
const BUILDER_PATTERN = [WORK, CARRY, CARRY, MOVE, MOVE];
const UPGRADER_PATTERN = [WORK, CARRY, MOVE, MOVE];
const DEFENDER_PATTERN = [TOUGH, RANGED_ATTACK, MOVE, MOVE];
class SpawnManager {
    constructor(colony) {
        this.colony = colony;
        this.queue = [];
    }
    init() {
        this.queue = this.buildQueue();
        Mem.getColony(this.colony.name).q = this.queue.length;
    }
    run() {
        const room = this.colony.room;
        if (!room || this.queue.length === 0) {
            return;
        }
        const idleSpawns = room.find(FIND_MY_SPAWNS, {
            filter: (spawn) => !spawn.spawning,
        });
        for (const spawn of idleSpawns) {
            const next = this.queue[0];
            if (!next) {
                break;
            }
            const creepName = `${this.colony.name}-${next.role}-${Game.time}-${Mem.nextUid()}`;
            const result = spawn.spawnCreep(next.body, creepName, { memory: next.memory });
            if (result === OK) {
                this.queue.shift();
            }
        }
        Mem.getColony(this.colony.name).q = this.queue.length;
    }
    getQueue() {
        return [...this.queue];
    }
    buildQueue() {
        const room = this.colony.room;
        if (!room) {
            return [];
        }
        const roleCounts = {
            emergencyHarvester: this.colony.getCreeps('emergencyHarvester').length,
            defender: this.colony.getCreeps('defender').length,
            hauler: this.colony.getCreeps('hauler').length,
            builder: this.colony.getCreeps('builder').length,
            upgrader: this.colony.getCreeps('upgrader').length,
        };
        const requests = [];
        if (roleCounts.emergencyHarvester === 0) {
            requests.push(this.createRequest('emergencyHarvester', 0, 'bootstrap economy'));
        }
        const requiredDefenders = this.colony.defenseManager.getRequiredDefenderCount();
        for (let index = roleCounts.defender; index < requiredDefenders; index += 1) {
            requests.push(this.createRequest('defender', 1, 'bunker defense'));
        }
        const minimumHaulers = room.storage ? ROLE_MINIMUMS.hauler : 1;
        for (let index = roleCounts.hauler; index < minimumHaulers; index += 1) {
            requests.push(this.createRequest('hauler', 2, 'maintain logistics throughput'));
        }
        const minimumBuilders = room.find(FIND_MY_CONSTRUCTION_SITES).length > 0 ? ROLE_MINIMUMS.builder : 0;
        for (let index = roleCounts.builder; index < minimumBuilders; index += 1) {
            requests.push(this.createRequest('builder', 3, 'complete construction sites'));
        }
        const minimumUpgraders = this.colony.upgradeManager.shouldUpgrade() ? ROLE_MINIMUMS.upgrader : 0;
        for (let index = roleCounts.upgrader; index < minimumUpgraders; index += 1) {
            requests.push(this.createRequest('upgrader', 4, 'maintain controller progress'));
        }
        return requests.sort((left, right) => left.priority - right.priority);
    }
    createRequest(role, priority, reason) {
        const room = this.colony.room;
        const energyBudget = role === 'emergencyHarvester' ? room?.energyAvailable ?? 300 : room?.energyCapacityAvailable ?? 300;
        const memory = {
            g: SYSTEM_GENERATION,
            r: role,
            rn: this.colony.name,
            s: 'load',
        };
        if (role === 'defender') {
            const boost = this.findBoostRequest();
            if (boost) {
                memory.b = boost;
            }
        }
        return {
            role,
            priority,
            body: this.getBody(role, energyBudget),
            memory,
            reason,
        };
    }
    getBody(role, energyBudget) {
        const room = this.colony.room;
        const energyLimit = room?.energyCapacityAvailable ?? energyBudget;
        const scaledBudget = Math.min(energyBudget, energyLimit);
        const buildElasticBody = (pattern) => {
            const body = buildRepeatedBody(pattern, scaledBudget, 1);
            if (getBodyCost(body) > energyLimit) {
                return [WORK, CARRY, MOVE];
            }
            return body;
        };
        switch (role) {
            case 'emergencyHarvester':
                return buildElasticBody(EMERGENCY_HARVESTER_PATTERN);
            case 'hauler':
                return buildElasticBody(HAULER_PATTERN);
            case 'builder':
                return buildElasticBody(BUILDER_PATTERN);
            case 'upgrader':
                return buildElasticBody(UPGRADER_PATTERN);
            case 'defender':
                if (getBodyCost(BUNKER_DEFENDER_BODY) <= scaledBudget) {
                    return [...BUNKER_DEFENDER_BODY];
                }
                return buildElasticBody(DEFENDER_PATTERN);
            default:
                return [...EMERGENCY_HARVESTER_PATTERN];
        }
    }
    findBoostRequest() {
        const room = this.colony.room;
        if (!room) {
            return undefined;
        }
        const labs = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_LAB,
        });
        for (const lab of labs) {
            for (const mineral of Object.keys(BOOST_STOCKPILE)) {
                if (lab.store.getUsedCapacity(RESOURCE_ENERGY) >= LAB_BOOST_ENERGY &&
                    lab.store.getUsedCapacity(mineral) >= LAB_BOOST_MINERAL) {
                    return {
                        labId: lab.id,
                        mineral,
                    };
                }
            }
        }
        return undefined;
    }
}

class UpgradeManager {
    constructor(colony) {
        this.colony = colony;
    }
    init() { }
    run() { }
    shouldUpgrade() {
        const room = this.colony.room;
        const controller = room?.controller;
        if (!room || !controller?.my) {
            return false;
        }
        const reserve = room.storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? room.energyAvailable;
        const currentDefcon = this.colony.defenseManager.getSnapshot().defcon;
        const isSafe = (controller.safeMode ?? 0) > 0;
        return currentDefcon === DEFCON.GREEN || isSafe || reserve > room.energyCapacityAvailable;
    }
    getTarget() {
        if (!this.shouldUpgrade()) {
            return undefined;
        }
        return this.colony.room?.controller;
    }
}

class Colony {
    constructor(name) {
        this.name = name;
        this.logisticsManager = new LogisticsManager(this);
        this.constructionManager = new ConstructionManager(this);
        this.defenseManager = new DefenseManager(this);
        this.spawnManager = new SpawnManager(this);
        this.upgradeManager = new UpgradeManager(this);
        this.behaviors = {
            emergencyHarvester: new HarvesterBehavior(),
            hauler: new HaulerBehavior(),
            builder: new BuilderBehavior(),
            upgrader: new UpgraderBehavior(),
            defender: new DefenderBehavior(),
        };
    }
    get room() {
        return Game.rooms[this.name];
    }
    init() {
        if (!this.room) {
            return;
        }
        this.defenseManager.init();
        this.logisticsManager.init();
        this.upgradeManager.init();
        this.spawnManager.init();
        this.constructionManager.init();
    }
    run() {
        if (!this.room) {
            return;
        }
        this.defenseManager.run();
        this.spawnManager.run();
        this.runCreeps();
        this.constructionManager.run();
        this.upgradeManager.run();
    }
    postRun() {
        const colonyMemory = Mem.getColony(this.name);
        colonyMemory.s = this.getCreeps().length;
    }
    getCreeps(role) {
        return Object.values(Game.creeps).filter((creep) => {
            const inColony = creep.memory.rn === this.name;
            return role ? inColony && creep.memory.r === role : inColony;
        });
    }
    getPrimarySpawn() {
        return this.room?.find(FIND_MY_SPAWNS)[0];
    }
    runCreeps() {
        let creepErrors = 0;
        for (const creep of this.getCreeps()) {
            // APOPTOSIS OVERRIDE: Purge obsolete generations
            if ((creep.memory.g ?? 0) < SYSTEM_GENERATION) {
                const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
                if (spawn) {
                    if (creep.store.getUsedCapacity() > 0) {
                        for (const resourceType in creep.store) {
                            if (creep.transfer(spawn, resourceType) === ERR_NOT_IN_RANGE) {
                                creep.moveTo(spawn);
                                break;
                            }
                        }
                    }
                    else if (spawn.recycleCreep(creep) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(spawn);
                    }
                }
                else {
                    creep.suicide();
                }
                continue;
            }
            const role = creep.memory.r;
            if (!role) {
                continue;
            }
            const behavior = this.behaviors[role];
            if (!behavior) {
                continue;
            }
            try {
                behavior.run(creep, this);
            }
            catch (error) {
                creepErrors += 1;
                console.log(`[colony:${this.name}] creep ${creep.name} failed: ${String(error)}`);
            }
        }
        if (creepErrors > 5) {
            throw new Error(`Catastrophic creep failure threshold reached: ${creepErrors} errors.`);
        }
    }
}

class Empire {
    constructor() {
        this.colonies = new Map();
    }
    static get() {
        Empire.instance ?? (Empire.instance = new Empire());
        return Empire.instance;
    }
    refresh() {
        const ownedRooms = Object.values(Game.rooms)
            .filter((room) => room.controller?.my || room.find(FIND_MY_SPAWNS).length > 0)
            .map((room) => room.name);
        for (const roomName of ownedRooms) {
            if (!this.colonies.has(roomName)) {
                this.colonies.set(roomName, new Colony(roomName));
            }
        }
        for (const roomName of [...this.colonies.keys()]) {
            if (!ownedRooms.includes(roomName)) {
                this.colonies.delete(roomName);
            }
        }
    }
    init() {
        for (const colony of this.getColonies()) {
            colony.init();
        }
    }
    run() {
        for (const colony of this.getColonies()) {
            colony.run();
        }
    }
    postRun() {
        for (const colony of this.getColonies()) {
            colony.postRun();
        }
        SegmentManager.appendStats(this.buildStatsSnapshot());
    }
    getColonies() {
        return [...this.colonies.values()];
    }
    buildStatsSnapshot() {
        return {
            time: Game.time,
            cpu: Game.cpu.getUsed(),
            bucket: Game.cpu.bucket,
            colonies: this.colonies.size,
            creeps: Object.keys(Game.creeps).length,
            buildTarget: "main",
        };
    }
}

var sourceMap = {};

var sourceMapGenerator = {};

var base64Vlq = {};

var base64 = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredBase64;

function requireBase64 () {
	if (hasRequiredBase64) return base64;
	hasRequiredBase64 = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

	/**
	 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
	 */
	base64.encode = function (number) {
	  if (0 <= number && number < intToCharMap.length) {
	    return intToCharMap[number];
	  }
	  throw new TypeError("Must be between 0 and 63: " + number);
	};

	/**
	 * Decode a single base 64 character code digit to an integer. Returns -1 on
	 * failure.
	 */
	base64.decode = function (charCode) {
	  var bigA = 65;     // 'A'
	  var bigZ = 90;     // 'Z'

	  var littleA = 97;  // 'a'
	  var littleZ = 122; // 'z'

	  var zero = 48;     // '0'
	  var nine = 57;     // '9'

	  var plus = 43;     // '+'
	  var slash = 47;    // '/'

	  var littleOffset = 26;
	  var numberOffset = 52;

	  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
	  if (bigA <= charCode && charCode <= bigZ) {
	    return (charCode - bigA);
	  }

	  // 26 - 51: abcdefghijklmnopqrstuvwxyz
	  if (littleA <= charCode && charCode <= littleZ) {
	    return (charCode - littleA + littleOffset);
	  }

	  // 52 - 61: 0123456789
	  if (zero <= charCode && charCode <= nine) {
	    return (charCode - zero + numberOffset);
	  }

	  // 62: +
	  if (charCode == plus) {
	    return 62;
	  }

	  // 63: /
	  if (charCode == slash) {
	    return 63;
	  }

	  // Invalid base64 digit.
	  return -1;
	};
	return base64;
}

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredBase64Vlq;

function requireBase64Vlq () {
	if (hasRequiredBase64Vlq) return base64Vlq;
	hasRequiredBase64Vlq = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 *
	 * Based on the Base 64 VLQ implementation in Closure Compiler:
	 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
	 *
	 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
	 * Redistribution and use in source and binary forms, with or without
	 * modification, are permitted provided that the following conditions are
	 * met:
	 *
	 *  * Redistributions of source code must retain the above copyright
	 *    notice, this list of conditions and the following disclaimer.
	 *  * Redistributions in binary form must reproduce the above
	 *    copyright notice, this list of conditions and the following
	 *    disclaimer in the documentation and/or other materials provided
	 *    with the distribution.
	 *  * Neither the name of Google Inc. nor the names of its
	 *    contributors may be used to endorse or promote products derived
	 *    from this software without specific prior written permission.
	 *
	 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
	 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
	 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
	 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
	 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
	 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
	 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
	 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */

	var base64 = requireBase64();

	// A single base 64 digit can contain 6 bits of data. For the base 64 variable
	// length quantities we use in the source map spec, the first bit is the sign,
	// the next four bits are the actual value, and the 6th bit is the
	// continuation bit. The continuation bit tells us whether there are more
	// digits in this value following this digit.
	//
	//   Continuation
	//   |    Sign
	//   |    |
	//   V    V
	//   101011

	var VLQ_BASE_SHIFT = 5;

	// binary: 100000
	var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

	// binary: 011111
	var VLQ_BASE_MASK = VLQ_BASE - 1;

	// binary: 100000
	var VLQ_CONTINUATION_BIT = VLQ_BASE;

	/**
	 * Converts from a two-complement value to a value where the sign bit is
	 * placed in the least significant bit.  For example, as decimals:
	 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
	 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
	 */
	function toVLQSigned(aValue) {
	  return aValue < 0
	    ? ((-aValue) << 1) + 1
	    : (aValue << 1) + 0;
	}

	/**
	 * Converts to a two-complement value from a value where the sign bit is
	 * placed in the least significant bit.  For example, as decimals:
	 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
	 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
	 */
	function fromVLQSigned(aValue) {
	  var isNegative = (aValue & 1) === 1;
	  var shifted = aValue >> 1;
	  return isNegative
	    ? -shifted
	    : shifted;
	}

	/**
	 * Returns the base 64 VLQ encoded value.
	 */
	base64Vlq.encode = function base64VLQ_encode(aValue) {
	  var encoded = "";
	  var digit;

	  var vlq = toVLQSigned(aValue);

	  do {
	    digit = vlq & VLQ_BASE_MASK;
	    vlq >>>= VLQ_BASE_SHIFT;
	    if (vlq > 0) {
	      // There are still more digits in this value, so we must make sure the
	      // continuation bit is marked.
	      digit |= VLQ_CONTINUATION_BIT;
	    }
	    encoded += base64.encode(digit);
	  } while (vlq > 0);

	  return encoded;
	};

	/**
	 * Decodes the next base 64 VLQ value from the given string and returns the
	 * value and the rest of the string via the out parameter.
	 */
	base64Vlq.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
	  var strLen = aStr.length;
	  var result = 0;
	  var shift = 0;
	  var continuation, digit;

	  do {
	    if (aIndex >= strLen) {
	      throw new Error("Expected more digits in base 64 VLQ value.");
	    }

	    digit = base64.decode(aStr.charCodeAt(aIndex++));
	    if (digit === -1) {
	      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
	    }

	    continuation = !!(digit & VLQ_CONTINUATION_BIT);
	    digit &= VLQ_BASE_MASK;
	    result = result + (digit << shift);
	    shift += VLQ_BASE_SHIFT;
	  } while (continuation);

	  aOutParam.value = fromVLQSigned(result);
	  aOutParam.rest = aIndex;
	};
	return base64Vlq;
}

var util = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredUtil;

function requireUtil () {
	if (hasRequiredUtil) return util;
	hasRequiredUtil = 1;
	(function (exports$1) {
		/*
		 * Copyright 2011 Mozilla Foundation and contributors
		 * Licensed under the New BSD license. See LICENSE or:
		 * http://opensource.org/licenses/BSD-3-Clause
		 */

		/**
		 * This is a helper function for getting values from parameter/options
		 * objects.
		 *
		 * @param args The object we are extracting values from
		 * @param name The name of the property we are getting.
		 * @param defaultValue An optional value to return if the property is missing
		 * from the object. If this is not specified and the property is missing, an
		 * error will be thrown.
		 */
		function getArg(aArgs, aName, aDefaultValue) {
		  if (aName in aArgs) {
		    return aArgs[aName];
		  } else if (arguments.length === 3) {
		    return aDefaultValue;
		  } else {
		    throw new Error('"' + aName + '" is a required argument.');
		  }
		}
		exports$1.getArg = getArg;

		var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
		var dataUrlRegexp = /^data:.+\,.+$/;

		function urlParse(aUrl) {
		  var match = aUrl.match(urlRegexp);
		  if (!match) {
		    return null;
		  }
		  return {
		    scheme: match[1],
		    auth: match[2],
		    host: match[3],
		    port: match[4],
		    path: match[5]
		  };
		}
		exports$1.urlParse = urlParse;

		function urlGenerate(aParsedUrl) {
		  var url = '';
		  if (aParsedUrl.scheme) {
		    url += aParsedUrl.scheme + ':';
		  }
		  url += '//';
		  if (aParsedUrl.auth) {
		    url += aParsedUrl.auth + '@';
		  }
		  if (aParsedUrl.host) {
		    url += aParsedUrl.host;
		  }
		  if (aParsedUrl.port) {
		    url += ":" + aParsedUrl.port;
		  }
		  if (aParsedUrl.path) {
		    url += aParsedUrl.path;
		  }
		  return url;
		}
		exports$1.urlGenerate = urlGenerate;

		var MAX_CACHED_INPUTS = 32;

		/**
		 * Takes some function `f(input) -> result` and returns a memoized version of
		 * `f`.
		 *
		 * We keep at most `MAX_CACHED_INPUTS` memoized results of `f` alive. The
		 * memoization is a dumb-simple, linear least-recently-used cache.
		 */
		function lruMemoize(f) {
		  var cache = [];

		  return function(input) {
		    for (var i = 0; i < cache.length; i++) {
		      if (cache[i].input === input) {
		        var temp = cache[0];
		        cache[0] = cache[i];
		        cache[i] = temp;
		        return cache[0].result;
		      }
		    }

		    var result = f(input);

		    cache.unshift({
		      input,
		      result,
		    });

		    if (cache.length > MAX_CACHED_INPUTS) {
		      cache.pop();
		    }

		    return result;
		  };
		}

		/**
		 * Normalizes a path, or the path portion of a URL:
		 *
		 * - Replaces consecutive slashes with one slash.
		 * - Removes unnecessary '.' parts.
		 * - Removes unnecessary '<dir>/..' parts.
		 *
		 * Based on code in the Node.js 'path' core module.
		 *
		 * @param aPath The path or url to normalize.
		 */
		var normalize = lruMemoize(function normalize(aPath) {
		  var path = aPath;
		  var url = urlParse(aPath);
		  if (url) {
		    if (!url.path) {
		      return aPath;
		    }
		    path = url.path;
		  }
		  var isAbsolute = exports$1.isAbsolute(path);
		  // Split the path into parts between `/` characters. This is much faster than
		  // using `.split(/\/+/g)`.
		  var parts = [];
		  var start = 0;
		  var i = 0;
		  while (true) {
		    start = i;
		    i = path.indexOf("/", start);
		    if (i === -1) {
		      parts.push(path.slice(start));
		      break;
		    } else {
		      parts.push(path.slice(start, i));
		      while (i < path.length && path[i] === "/") {
		        i++;
		      }
		    }
		  }

		  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
		    part = parts[i];
		    if (part === '.') {
		      parts.splice(i, 1);
		    } else if (part === '..') {
		      up++;
		    } else if (up > 0) {
		      if (part === '') {
		        // The first part is blank if the path is absolute. Trying to go
		        // above the root is a no-op. Therefore we can remove all '..' parts
		        // directly after the root.
		        parts.splice(i + 1, up);
		        up = 0;
		      } else {
		        parts.splice(i, 2);
		        up--;
		      }
		    }
		  }
		  path = parts.join('/');

		  if (path === '') {
		    path = isAbsolute ? '/' : '.';
		  }

		  if (url) {
		    url.path = path;
		    return urlGenerate(url);
		  }
		  return path;
		});
		exports$1.normalize = normalize;

		/**
		 * Joins two paths/URLs.
		 *
		 * @param aRoot The root path or URL.
		 * @param aPath The path or URL to be joined with the root.
		 *
		 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
		 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
		 *   first.
		 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
		 *   is updated with the result and aRoot is returned. Otherwise the result
		 *   is returned.
		 *   - If aPath is absolute, the result is aPath.
		 *   - Otherwise the two paths are joined with a slash.
		 * - Joining for example 'http://' and 'www.example.com' is also supported.
		 */
		function join(aRoot, aPath) {
		  if (aRoot === "") {
		    aRoot = ".";
		  }
		  if (aPath === "") {
		    aPath = ".";
		  }
		  var aPathUrl = urlParse(aPath);
		  var aRootUrl = urlParse(aRoot);
		  if (aRootUrl) {
		    aRoot = aRootUrl.path || '/';
		  }

		  // `join(foo, '//www.example.org')`
		  if (aPathUrl && !aPathUrl.scheme) {
		    if (aRootUrl) {
		      aPathUrl.scheme = aRootUrl.scheme;
		    }
		    return urlGenerate(aPathUrl);
		  }

		  if (aPathUrl || aPath.match(dataUrlRegexp)) {
		    return aPath;
		  }

		  // `join('http://', 'www.example.com')`
		  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
		    aRootUrl.host = aPath;
		    return urlGenerate(aRootUrl);
		  }

		  var joined = aPath.charAt(0) === '/'
		    ? aPath
		    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

		  if (aRootUrl) {
		    aRootUrl.path = joined;
		    return urlGenerate(aRootUrl);
		  }
		  return joined;
		}
		exports$1.join = join;

		exports$1.isAbsolute = function (aPath) {
		  return aPath.charAt(0) === '/' || urlRegexp.test(aPath);
		};

		/**
		 * Make a path relative to a URL or another path.
		 *
		 * @param aRoot The root path or URL.
		 * @param aPath The path or URL to be made relative to aRoot.
		 */
		function relative(aRoot, aPath) {
		  if (aRoot === "") {
		    aRoot = ".";
		  }

		  aRoot = aRoot.replace(/\/$/, '');

		  // It is possible for the path to be above the root. In this case, simply
		  // checking whether the root is a prefix of the path won't work. Instead, we
		  // need to remove components from the root one by one, until either we find
		  // a prefix that fits, or we run out of components to remove.
		  var level = 0;
		  while (aPath.indexOf(aRoot + '/') !== 0) {
		    var index = aRoot.lastIndexOf("/");
		    if (index < 0) {
		      return aPath;
		    }

		    // If the only part of the root that is left is the scheme (i.e. http://,
		    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
		    // have exhausted all components, so the path is not relative to the root.
		    aRoot = aRoot.slice(0, index);
		    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
		      return aPath;
		    }

		    ++level;
		  }

		  // Make sure we add a "../" for each component we removed from the root.
		  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
		}
		exports$1.relative = relative;

		var supportsNullProto = (function () {
		  var obj = Object.create(null);
		  return !('__proto__' in obj);
		}());

		function identity (s) {
		  return s;
		}

		/**
		 * Because behavior goes wacky when you set `__proto__` on objects, we
		 * have to prefix all the strings in our set with an arbitrary character.
		 *
		 * See https://github.com/mozilla/source-map/pull/31 and
		 * https://github.com/mozilla/source-map/issues/30
		 *
		 * @param String aStr
		 */
		function toSetString(aStr) {
		  if (isProtoString(aStr)) {
		    return '$' + aStr;
		  }

		  return aStr;
		}
		exports$1.toSetString = supportsNullProto ? identity : toSetString;

		function fromSetString(aStr) {
		  if (isProtoString(aStr)) {
		    return aStr.slice(1);
		  }

		  return aStr;
		}
		exports$1.fromSetString = supportsNullProto ? identity : fromSetString;

		function isProtoString(s) {
		  if (!s) {
		    return false;
		  }

		  var length = s.length;

		  if (length < 9 /* "__proto__".length */) {
		    return false;
		  }

		  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
		      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
		      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
		      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
		      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
		      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
		      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
		      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
		      s.charCodeAt(length - 9) !== 95  /* '_' */) {
		    return false;
		  }

		  for (var i = length - 10; i >= 0; i--) {
		    if (s.charCodeAt(i) !== 36 /* '$' */) {
		      return false;
		    }
		  }

		  return true;
		}

		/**
		 * Comparator between two mappings where the original positions are compared.
		 *
		 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
		 * mappings with the same original source/line/column, but different generated
		 * line and column the same. Useful when searching for a mapping with a
		 * stubbed out mapping.
		 */
		function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
		  var cmp = strcmp(mappingA.source, mappingB.source);
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalLine - mappingB.originalLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalColumn - mappingB.originalColumn;
		  if (cmp !== 0 || onlyCompareOriginal) {
		    return cmp;
		  }

		  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.generatedLine - mappingB.generatedLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  return strcmp(mappingA.name, mappingB.name);
		}
		exports$1.compareByOriginalPositions = compareByOriginalPositions;

		function compareByOriginalPositionsNoSource(mappingA, mappingB, onlyCompareOriginal) {
		  var cmp;

		  cmp = mappingA.originalLine - mappingB.originalLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalColumn - mappingB.originalColumn;
		  if (cmp !== 0 || onlyCompareOriginal) {
		    return cmp;
		  }

		  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.generatedLine - mappingB.generatedLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  return strcmp(mappingA.name, mappingB.name);
		}
		exports$1.compareByOriginalPositionsNoSource = compareByOriginalPositionsNoSource;

		/**
		 * Comparator between two mappings with deflated source and name indices where
		 * the generated positions are compared.
		 *
		 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
		 * mappings with the same generated line and column, but different
		 * source/name/original line and column the same. Useful when searching for a
		 * mapping with a stubbed out mapping.
		 */
		function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
		  var cmp = mappingA.generatedLine - mappingB.generatedLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
		  if (cmp !== 0 || onlyCompareGenerated) {
		    return cmp;
		  }

		  cmp = strcmp(mappingA.source, mappingB.source);
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalLine - mappingB.originalLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalColumn - mappingB.originalColumn;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  return strcmp(mappingA.name, mappingB.name);
		}
		exports$1.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

		function compareByGeneratedPositionsDeflatedNoLine(mappingA, mappingB, onlyCompareGenerated) {
		  var cmp = mappingA.generatedColumn - mappingB.generatedColumn;
		  if (cmp !== 0 || onlyCompareGenerated) {
		    return cmp;
		  }

		  cmp = strcmp(mappingA.source, mappingB.source);
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalLine - mappingB.originalLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalColumn - mappingB.originalColumn;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  return strcmp(mappingA.name, mappingB.name);
		}
		exports$1.compareByGeneratedPositionsDeflatedNoLine = compareByGeneratedPositionsDeflatedNoLine;

		function strcmp(aStr1, aStr2) {
		  if (aStr1 === aStr2) {
		    return 0;
		  }

		  if (aStr1 === null) {
		    return 1; // aStr2 !== null
		  }

		  if (aStr2 === null) {
		    return -1; // aStr1 !== null
		  }

		  if (aStr1 > aStr2) {
		    return 1;
		  }

		  return -1;
		}

		/**
		 * Comparator between two mappings with inflated source and name strings where
		 * the generated positions are compared.
		 */
		function compareByGeneratedPositionsInflated(mappingA, mappingB) {
		  var cmp = mappingA.generatedLine - mappingB.generatedLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = strcmp(mappingA.source, mappingB.source);
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalLine - mappingB.originalLine;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  cmp = mappingA.originalColumn - mappingB.originalColumn;
		  if (cmp !== 0) {
		    return cmp;
		  }

		  return strcmp(mappingA.name, mappingB.name);
		}
		exports$1.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

		/**
		 * Strip any JSON XSSI avoidance prefix from the string (as documented
		 * in the source maps specification), and then parse the string as
		 * JSON.
		 */
		function parseSourceMapInput(str) {
		  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
		}
		exports$1.parseSourceMapInput = parseSourceMapInput;

		/**
		 * Compute the URL of a source given the the source root, the source's
		 * URL, and the source map's URL.
		 */
		function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
		  sourceURL = sourceURL || '';

		  if (sourceRoot) {
		    // This follows what Chrome does.
		    if (sourceRoot[sourceRoot.length - 1] !== '/' && sourceURL[0] !== '/') {
		      sourceRoot += '/';
		    }
		    // The spec says:
		    //   Line 4: An optional source root, useful for relocating source
		    //   files on a server or removing repeated values in the
		    //   “sources” entry.  This value is prepended to the individual
		    //   entries in the “source” field.
		    sourceURL = sourceRoot + sourceURL;
		  }

		  // Historically, SourceMapConsumer did not take the sourceMapURL as
		  // a parameter.  This mode is still somewhat supported, which is why
		  // this code block is conditional.  However, it's preferable to pass
		  // the source map URL to SourceMapConsumer, so that this function
		  // can implement the source URL resolution algorithm as outlined in
		  // the spec.  This block is basically the equivalent of:
		  //    new URL(sourceURL, sourceMapURL).toString()
		  // ... except it avoids using URL, which wasn't available in the
		  // older releases of node still supported by this library.
		  //
		  // The spec says:
		  //   If the sources are not absolute URLs after prepending of the
		  //   “sourceRoot”, the sources are resolved relative to the
		  //   SourceMap (like resolving script src in a html document).
		  if (sourceMapURL) {
		    var parsed = urlParse(sourceMapURL);
		    if (!parsed) {
		      throw new Error("sourceMapURL could not be parsed");
		    }
		    if (parsed.path) {
		      // Strip the last path component, but keep the "/".
		      var index = parsed.path.lastIndexOf('/');
		      if (index >= 0) {
		        parsed.path = parsed.path.substring(0, index + 1);
		      }
		    }
		    sourceURL = join(urlGenerate(parsed), sourceURL);
		  }

		  return normalize(sourceURL);
		}
		exports$1.computeSourceURL = computeSourceURL; 
	} (util));
	return util;
}

var arraySet = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredArraySet;

function requireArraySet () {
	if (hasRequiredArraySet) return arraySet;
	hasRequiredArraySet = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var util = requireUtil();
	var has = Object.prototype.hasOwnProperty;
	var hasNativeMap = typeof Map !== "undefined";

	/**
	 * A data structure which is a combination of an array and a set. Adding a new
	 * member is O(1), testing for membership is O(1), and finding the index of an
	 * element is O(1). Removing elements from the set is not supported. Only
	 * strings are supported for membership.
	 */
	function ArraySet() {
	  this._array = [];
	  this._set = hasNativeMap ? new Map() : Object.create(null);
	}

	/**
	 * Static method for creating ArraySet instances from an existing array.
	 */
	ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
	  var set = new ArraySet();
	  for (var i = 0, len = aArray.length; i < len; i++) {
	    set.add(aArray[i], aAllowDuplicates);
	  }
	  return set;
	};

	/**
	 * Return how many unique items are in this ArraySet. If duplicates have been
	 * added, than those do not count towards the size.
	 *
	 * @returns Number
	 */
	ArraySet.prototype.size = function ArraySet_size() {
	  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
	};

	/**
	 * Add the given string to this set.
	 *
	 * @param String aStr
	 */
	ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
	  var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
	  var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
	  var idx = this._array.length;
	  if (!isDuplicate || aAllowDuplicates) {
	    this._array.push(aStr);
	  }
	  if (!isDuplicate) {
	    if (hasNativeMap) {
	      this._set.set(aStr, idx);
	    } else {
	      this._set[sStr] = idx;
	    }
	  }
	};

	/**
	 * Is the given string a member of this set?
	 *
	 * @param String aStr
	 */
	ArraySet.prototype.has = function ArraySet_has(aStr) {
	  if (hasNativeMap) {
	    return this._set.has(aStr);
	  } else {
	    var sStr = util.toSetString(aStr);
	    return has.call(this._set, sStr);
	  }
	};

	/**
	 * What is the index of the given string in the array?
	 *
	 * @param String aStr
	 */
	ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
	  if (hasNativeMap) {
	    var idx = this._set.get(aStr);
	    if (idx >= 0) {
	        return idx;
	    }
	  } else {
	    var sStr = util.toSetString(aStr);
	    if (has.call(this._set, sStr)) {
	      return this._set[sStr];
	    }
	  }

	  throw new Error('"' + aStr + '" is not in the set.');
	};

	/**
	 * What is the element at the given index?
	 *
	 * @param Number aIdx
	 */
	ArraySet.prototype.at = function ArraySet_at(aIdx) {
	  if (aIdx >= 0 && aIdx < this._array.length) {
	    return this._array[aIdx];
	  }
	  throw new Error('No element indexed by ' + aIdx);
	};

	/**
	 * Returns the array representation of this set (which has the proper indices
	 * indicated by indexOf). Note that this is a copy of the internal array used
	 * for storing the members so that no one can mess with internal state.
	 */
	ArraySet.prototype.toArray = function ArraySet_toArray() {
	  return this._array.slice();
	};

	arraySet.ArraySet = ArraySet;
	return arraySet;
}

var mappingList = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredMappingList;

function requireMappingList () {
	if (hasRequiredMappingList) return mappingList;
	hasRequiredMappingList = 1;
	/*
	 * Copyright 2014 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var util = requireUtil();

	/**
	 * Determine whether mappingB is after mappingA with respect to generated
	 * position.
	 */
	function generatedPositionAfter(mappingA, mappingB) {
	  // Optimized for most common case
	  var lineA = mappingA.generatedLine;
	  var lineB = mappingB.generatedLine;
	  var columnA = mappingA.generatedColumn;
	  var columnB = mappingB.generatedColumn;
	  return lineB > lineA || lineB == lineA && columnB >= columnA ||
	         util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
	}

	/**
	 * A data structure to provide a sorted view of accumulated mappings in a
	 * performance conscious manner. It trades a neglibable overhead in general
	 * case for a large speedup in case of mappings being added in order.
	 */
	function MappingList() {
	  this._array = [];
	  this._sorted = true;
	  // Serves as infimum
	  this._last = {generatedLine: -1, generatedColumn: 0};
	}

	/**
	 * Iterate through internal items. This method takes the same arguments that
	 * `Array.prototype.forEach` takes.
	 *
	 * NOTE: The order of the mappings is NOT guaranteed.
	 */
	MappingList.prototype.unsortedForEach =
	  function MappingList_forEach(aCallback, aThisArg) {
	    this._array.forEach(aCallback, aThisArg);
	  };

	/**
	 * Add the given source mapping.
	 *
	 * @param Object aMapping
	 */
	MappingList.prototype.add = function MappingList_add(aMapping) {
	  if (generatedPositionAfter(this._last, aMapping)) {
	    this._last = aMapping;
	    this._array.push(aMapping);
	  } else {
	    this._sorted = false;
	    this._array.push(aMapping);
	  }
	};

	/**
	 * Returns the flat, sorted array of mappings. The mappings are sorted by
	 * generated position.
	 *
	 * WARNING: This method returns internal data without copying, for
	 * performance. The return value must NOT be mutated, and should be treated as
	 * an immutable borrow. If you want to take ownership, you must make your own
	 * copy.
	 */
	MappingList.prototype.toArray = function MappingList_toArray() {
	  if (!this._sorted) {
	    this._array.sort(util.compareByGeneratedPositionsInflated);
	    this._sorted = true;
	  }
	  return this._array;
	};

	mappingList.MappingList = MappingList;
	return mappingList;
}

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredSourceMapGenerator;

function requireSourceMapGenerator () {
	if (hasRequiredSourceMapGenerator) return sourceMapGenerator;
	hasRequiredSourceMapGenerator = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var base64VLQ = requireBase64Vlq();
	var util = requireUtil();
	var ArraySet = requireArraySet().ArraySet;
	var MappingList = requireMappingList().MappingList;

	/**
	 * An instance of the SourceMapGenerator represents a source map which is
	 * being built incrementally. You may pass an object with the following
	 * properties:
	 *
	 *   - file: The filename of the generated source.
	 *   - sourceRoot: A root for all relative URLs in this source map.
	 */
	function SourceMapGenerator(aArgs) {
	  if (!aArgs) {
	    aArgs = {};
	  }
	  this._file = util.getArg(aArgs, 'file', null);
	  this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
	  this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
	  this._ignoreInvalidMapping = util.getArg(aArgs, 'ignoreInvalidMapping', false);
	  this._sources = new ArraySet();
	  this._names = new ArraySet();
	  this._mappings = new MappingList();
	  this._sourcesContents = null;
	}

	SourceMapGenerator.prototype._version = 3;

	/**
	 * Creates a new SourceMapGenerator based on a SourceMapConsumer
	 *
	 * @param aSourceMapConsumer The SourceMap.
	 */
	SourceMapGenerator.fromSourceMap =
	  function SourceMapGenerator_fromSourceMap(aSourceMapConsumer, generatorOps) {
	    var sourceRoot = aSourceMapConsumer.sourceRoot;
	    var generator = new SourceMapGenerator(Object.assign(generatorOps || {}, {
	      file: aSourceMapConsumer.file,
	      sourceRoot: sourceRoot
	    }));
	    aSourceMapConsumer.eachMapping(function (mapping) {
	      var newMapping = {
	        generated: {
	          line: mapping.generatedLine,
	          column: mapping.generatedColumn
	        }
	      };

	      if (mapping.source != null) {
	        newMapping.source = mapping.source;
	        if (sourceRoot != null) {
	          newMapping.source = util.relative(sourceRoot, newMapping.source);
	        }

	        newMapping.original = {
	          line: mapping.originalLine,
	          column: mapping.originalColumn
	        };

	        if (mapping.name != null) {
	          newMapping.name = mapping.name;
	        }
	      }

	      generator.addMapping(newMapping);
	    });
	    aSourceMapConsumer.sources.forEach(function (sourceFile) {
	      var sourceRelative = sourceFile;
	      if (sourceRoot !== null) {
	        sourceRelative = util.relative(sourceRoot, sourceFile);
	      }

	      if (!generator._sources.has(sourceRelative)) {
	        generator._sources.add(sourceRelative);
	      }

	      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
	      if (content != null) {
	        generator.setSourceContent(sourceFile, content);
	      }
	    });
	    return generator;
	  };

	/**
	 * Add a single mapping from original source line and column to the generated
	 * source's line and column for this source map being created. The mapping
	 * object should have the following properties:
	 *
	 *   - generated: An object with the generated line and column positions.
	 *   - original: An object with the original line and column positions.
	 *   - source: The original source file (relative to the sourceRoot).
	 *   - name: An optional original token name for this mapping.
	 */
	SourceMapGenerator.prototype.addMapping =
	  function SourceMapGenerator_addMapping(aArgs) {
	    var generated = util.getArg(aArgs, 'generated');
	    var original = util.getArg(aArgs, 'original', null);
	    var source = util.getArg(aArgs, 'source', null);
	    var name = util.getArg(aArgs, 'name', null);

	    if (!this._skipValidation) {
	      if (this._validateMapping(generated, original, source, name) === false) {
	        return;
	      }
	    }

	    if (source != null) {
	      source = String(source);
	      if (!this._sources.has(source)) {
	        this._sources.add(source);
	      }
	    }

	    if (name != null) {
	      name = String(name);
	      if (!this._names.has(name)) {
	        this._names.add(name);
	      }
	    }

	    this._mappings.add({
	      generatedLine: generated.line,
	      generatedColumn: generated.column,
	      originalLine: original != null && original.line,
	      originalColumn: original != null && original.column,
	      source: source,
	      name: name
	    });
	  };

	/**
	 * Set the source content for a source file.
	 */
	SourceMapGenerator.prototype.setSourceContent =
	  function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
	    var source = aSourceFile;
	    if (this._sourceRoot != null) {
	      source = util.relative(this._sourceRoot, source);
	    }

	    if (aSourceContent != null) {
	      // Add the source content to the _sourcesContents map.
	      // Create a new _sourcesContents map if the property is null.
	      if (!this._sourcesContents) {
	        this._sourcesContents = Object.create(null);
	      }
	      this._sourcesContents[util.toSetString(source)] = aSourceContent;
	    } else if (this._sourcesContents) {
	      // Remove the source file from the _sourcesContents map.
	      // If the _sourcesContents map is empty, set the property to null.
	      delete this._sourcesContents[util.toSetString(source)];
	      if (Object.keys(this._sourcesContents).length === 0) {
	        this._sourcesContents = null;
	      }
	    }
	  };

	/**
	 * Applies the mappings of a sub-source-map for a specific source file to the
	 * source map being generated. Each mapping to the supplied source file is
	 * rewritten using the supplied source map. Note: The resolution for the
	 * resulting mappings is the minimium of this map and the supplied map.
	 *
	 * @param aSourceMapConsumer The source map to be applied.
	 * @param aSourceFile Optional. The filename of the source file.
	 *        If omitted, SourceMapConsumer's file property will be used.
	 * @param aSourceMapPath Optional. The dirname of the path to the source map
	 *        to be applied. If relative, it is relative to the SourceMapConsumer.
	 *        This parameter is needed when the two source maps aren't in the same
	 *        directory, and the source map to be applied contains relative source
	 *        paths. If so, those relative source paths need to be rewritten
	 *        relative to the SourceMapGenerator.
	 */
	SourceMapGenerator.prototype.applySourceMap =
	  function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
	    var sourceFile = aSourceFile;
	    // If aSourceFile is omitted, we will use the file property of the SourceMap
	    if (aSourceFile == null) {
	      if (aSourceMapConsumer.file == null) {
	        throw new Error(
	          'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
	          'or the source map\'s "file" property. Both were omitted.'
	        );
	      }
	      sourceFile = aSourceMapConsumer.file;
	    }
	    var sourceRoot = this._sourceRoot;
	    // Make "sourceFile" relative if an absolute Url is passed.
	    if (sourceRoot != null) {
	      sourceFile = util.relative(sourceRoot, sourceFile);
	    }
	    // Applying the SourceMap can add and remove items from the sources and
	    // the names array.
	    var newSources = new ArraySet();
	    var newNames = new ArraySet();

	    // Find mappings for the "sourceFile"
	    this._mappings.unsortedForEach(function (mapping) {
	      if (mapping.source === sourceFile && mapping.originalLine != null) {
	        // Check if it can be mapped by the source map, then update the mapping.
	        var original = aSourceMapConsumer.originalPositionFor({
	          line: mapping.originalLine,
	          column: mapping.originalColumn
	        });
	        if (original.source != null) {
	          // Copy mapping
	          mapping.source = original.source;
	          if (aSourceMapPath != null) {
	            mapping.source = util.join(aSourceMapPath, mapping.source);
	          }
	          if (sourceRoot != null) {
	            mapping.source = util.relative(sourceRoot, mapping.source);
	          }
	          mapping.originalLine = original.line;
	          mapping.originalColumn = original.column;
	          if (original.name != null) {
	            mapping.name = original.name;
	          }
	        }
	      }

	      var source = mapping.source;
	      if (source != null && !newSources.has(source)) {
	        newSources.add(source);
	      }

	      var name = mapping.name;
	      if (name != null && !newNames.has(name)) {
	        newNames.add(name);
	      }

	    }, this);
	    this._sources = newSources;
	    this._names = newNames;

	    // Copy sourcesContents of applied map.
	    aSourceMapConsumer.sources.forEach(function (sourceFile) {
	      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
	      if (content != null) {
	        if (aSourceMapPath != null) {
	          sourceFile = util.join(aSourceMapPath, sourceFile);
	        }
	        if (sourceRoot != null) {
	          sourceFile = util.relative(sourceRoot, sourceFile);
	        }
	        this.setSourceContent(sourceFile, content);
	      }
	    }, this);
	  };

	/**
	 * A mapping can have one of the three levels of data:
	 *
	 *   1. Just the generated position.
	 *   2. The Generated position, original position, and original source.
	 *   3. Generated and original position, original source, as well as a name
	 *      token.
	 *
	 * To maintain consistency, we validate that any new mapping being added falls
	 * in to one of these categories.
	 */
	SourceMapGenerator.prototype._validateMapping =
	  function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
	                                              aName) {
	    // When aOriginal is truthy but has empty values for .line and .column,
	    // it is most likely a programmer error. In this case we throw a very
	    // specific error message to try to guide them the right way.
	    // For example: https://github.com/Polymer/polymer-bundler/pull/519
	    if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
	      var message = 'original.line and original.column are not numbers -- you probably meant to omit ' +
	      'the original mapping entirely and only map the generated position. If so, pass ' +
	      'null for the original mapping instead of an object with empty or null values.';

	      if (this._ignoreInvalidMapping) {
	        if (typeof console !== 'undefined' && console.warn) {
	          console.warn(message);
	        }
	        return false;
	      } else {
	        throw new Error(message);
	      }
	    }

	    if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
	        && aGenerated.line > 0 && aGenerated.column >= 0
	        && !aOriginal && !aSource && !aName) {
	      // Case 1.
	      return;
	    }
	    else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
	             && aOriginal && 'line' in aOriginal && 'column' in aOriginal
	             && aGenerated.line > 0 && aGenerated.column >= 0
	             && aOriginal.line > 0 && aOriginal.column >= 0
	             && aSource) {
	      // Cases 2 and 3.
	      return;
	    }
	    else {
	      var message = 'Invalid mapping: ' + JSON.stringify({
	        generated: aGenerated,
	        source: aSource,
	        original: aOriginal,
	        name: aName
	      });

	      if (this._ignoreInvalidMapping) {
	        if (typeof console !== 'undefined' && console.warn) {
	          console.warn(message);
	        }
	        return false;
	      } else {
	        throw new Error(message)
	      }
	    }
	  };

	/**
	 * Serialize the accumulated mappings in to the stream of base 64 VLQs
	 * specified by the source map format.
	 */
	SourceMapGenerator.prototype._serializeMappings =
	  function SourceMapGenerator_serializeMappings() {
	    var previousGeneratedColumn = 0;
	    var previousGeneratedLine = 1;
	    var previousOriginalColumn = 0;
	    var previousOriginalLine = 0;
	    var previousName = 0;
	    var previousSource = 0;
	    var result = '';
	    var next;
	    var mapping;
	    var nameIdx;
	    var sourceIdx;

	    var mappings = this._mappings.toArray();
	    for (var i = 0, len = mappings.length; i < len; i++) {
	      mapping = mappings[i];
	      next = '';

	      if (mapping.generatedLine !== previousGeneratedLine) {
	        previousGeneratedColumn = 0;
	        while (mapping.generatedLine !== previousGeneratedLine) {
	          next += ';';
	          previousGeneratedLine++;
	        }
	      }
	      else {
	        if (i > 0) {
	          if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
	            continue;
	          }
	          next += ',';
	        }
	      }

	      next += base64VLQ.encode(mapping.generatedColumn
	                                 - previousGeneratedColumn);
	      previousGeneratedColumn = mapping.generatedColumn;

	      if (mapping.source != null) {
	        sourceIdx = this._sources.indexOf(mapping.source);
	        next += base64VLQ.encode(sourceIdx - previousSource);
	        previousSource = sourceIdx;

	        // lines are stored 0-based in SourceMap spec version 3
	        next += base64VLQ.encode(mapping.originalLine - 1
	                                   - previousOriginalLine);
	        previousOriginalLine = mapping.originalLine - 1;

	        next += base64VLQ.encode(mapping.originalColumn
	                                   - previousOriginalColumn);
	        previousOriginalColumn = mapping.originalColumn;

	        if (mapping.name != null) {
	          nameIdx = this._names.indexOf(mapping.name);
	          next += base64VLQ.encode(nameIdx - previousName);
	          previousName = nameIdx;
	        }
	      }

	      result += next;
	    }

	    return result;
	  };

	SourceMapGenerator.prototype._generateSourcesContent =
	  function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
	    return aSources.map(function (source) {
	      if (!this._sourcesContents) {
	        return null;
	      }
	      if (aSourceRoot != null) {
	        source = util.relative(aSourceRoot, source);
	      }
	      var key = util.toSetString(source);
	      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
	        ? this._sourcesContents[key]
	        : null;
	    }, this);
	  };

	/**
	 * Externalize the source map.
	 */
	SourceMapGenerator.prototype.toJSON =
	  function SourceMapGenerator_toJSON() {
	    var map = {
	      version: this._version,
	      sources: this._sources.toArray(),
	      names: this._names.toArray(),
	      mappings: this._serializeMappings()
	    };
	    if (this._file != null) {
	      map.file = this._file;
	    }
	    if (this._sourceRoot != null) {
	      map.sourceRoot = this._sourceRoot;
	    }
	    if (this._sourcesContents) {
	      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
	    }

	    return map;
	  };

	/**
	 * Render the source map being generated to a string.
	 */
	SourceMapGenerator.prototype.toString =
	  function SourceMapGenerator_toString() {
	    return JSON.stringify(this.toJSON());
	  };

	sourceMapGenerator.SourceMapGenerator = SourceMapGenerator;
	return sourceMapGenerator;
}

var sourceMapConsumer$1 = {};

var binarySearch = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredBinarySearch;

function requireBinarySearch () {
	if (hasRequiredBinarySearch) return binarySearch;
	hasRequiredBinarySearch = 1;
	(function (exports$1) {
		/*
		 * Copyright 2011 Mozilla Foundation and contributors
		 * Licensed under the New BSD license. See LICENSE or:
		 * http://opensource.org/licenses/BSD-3-Clause
		 */

		exports$1.GREATEST_LOWER_BOUND = 1;
		exports$1.LEAST_UPPER_BOUND = 2;

		/**
		 * Recursive implementation of binary search.
		 *
		 * @param aLow Indices here and lower do not contain the needle.
		 * @param aHigh Indices here and higher do not contain the needle.
		 * @param aNeedle The element being searched for.
		 * @param aHaystack The non-empty array being searched.
		 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
		 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
		 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
		 *     closest element that is smaller than or greater than the one we are
		 *     searching for, respectively, if the exact element cannot be found.
		 */
		function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
		  // This function terminates when one of the following is true:
		  //
		  //   1. We find the exact element we are looking for.
		  //
		  //   2. We did not find the exact element, but we can return the index of
		  //      the next-closest element.
		  //
		  //   3. We did not find the exact element, and there is no next-closest
		  //      element than the one we are searching for, so we return -1.
		  var mid = Math.floor((aHigh - aLow) / 2) + aLow;
		  var cmp = aCompare(aNeedle, aHaystack[mid], true);
		  if (cmp === 0) {
		    // Found the element we are looking for.
		    return mid;
		  }
		  else if (cmp > 0) {
		    // Our needle is greater than aHaystack[mid].
		    if (aHigh - mid > 1) {
		      // The element is in the upper half.
		      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
		    }

		    // The exact needle element was not found in this haystack. Determine if
		    // we are in termination case (3) or (2) and return the appropriate thing.
		    if (aBias == exports$1.LEAST_UPPER_BOUND) {
		      return aHigh < aHaystack.length ? aHigh : -1;
		    } else {
		      return mid;
		    }
		  }
		  else {
		    // Our needle is less than aHaystack[mid].
		    if (mid - aLow > 1) {
		      // The element is in the lower half.
		      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
		    }

		    // we are in termination case (3) or (2) and return the appropriate thing.
		    if (aBias == exports$1.LEAST_UPPER_BOUND) {
		      return mid;
		    } else {
		      return aLow < 0 ? -1 : aLow;
		    }
		  }
		}

		/**
		 * This is an implementation of binary search which will always try and return
		 * the index of the closest element if there is no exact hit. This is because
		 * mappings between original and generated line/col pairs are single points,
		 * and there is an implicit region between each of them, so a miss just means
		 * that you aren't on the very start of a region.
		 *
		 * @param aNeedle The element you are looking for.
		 * @param aHaystack The array that is being searched.
		 * @param aCompare A function which takes the needle and an element in the
		 *     array and returns -1, 0, or 1 depending on whether the needle is less
		 *     than, equal to, or greater than the element, respectively.
		 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
		 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
		 *     closest element that is smaller than or greater than the one we are
		 *     searching for, respectively, if the exact element cannot be found.
		 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
		 */
		exports$1.search = function search(aNeedle, aHaystack, aCompare, aBias) {
		  if (aHaystack.length === 0) {
		    return -1;
		  }

		  var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
		                              aCompare, aBias || exports$1.GREATEST_LOWER_BOUND);
		  if (index < 0) {
		    return -1;
		  }

		  // We have found either the exact element, or the next-closest element than
		  // the one we are searching for. However, there may be more than one such
		  // element. Make sure we always return the smallest of these.
		  while (index - 1 >= 0) {
		    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
		      break;
		    }
		    --index;
		  }

		  return index;
		}; 
	} (binarySearch));
	return binarySearch;
}

var quickSort = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredQuickSort;

function requireQuickSort () {
	if (hasRequiredQuickSort) return quickSort;
	hasRequiredQuickSort = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	// It turns out that some (most?) JavaScript engines don't self-host
	// `Array.prototype.sort`. This makes sense because C++ will likely remain
	// faster than JS when doing raw CPU-intensive sorting. However, when using a
	// custom comparator function, calling back and forth between the VM's C++ and
	// JIT'd JS is rather slow *and* loses JIT type information, resulting in
	// worse generated code for the comparator function than would be optimal. In
	// fact, when sorting with a comparator, these costs outweigh the benefits of
	// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
	// a ~3500ms mean speed-up in `bench/bench.html`.

	function SortTemplate(comparator) {

	/**
	 * Swap the elements indexed by `x` and `y` in the array `ary`.
	 *
	 * @param {Array} ary
	 *        The array.
	 * @param {Number} x
	 *        The index of the first item.
	 * @param {Number} y
	 *        The index of the second item.
	 */
	function swap(ary, x, y) {
	  var temp = ary[x];
	  ary[x] = ary[y];
	  ary[y] = temp;
	}

	/**
	 * Returns a random integer within the range `low .. high` inclusive.
	 *
	 * @param {Number} low
	 *        The lower bound on the range.
	 * @param {Number} high
	 *        The upper bound on the range.
	 */
	function randomIntInRange(low, high) {
	  return Math.round(low + (Math.random() * (high - low)));
	}

	/**
	 * The Quick Sort algorithm.
	 *
	 * @param {Array} ary
	 *        An array to sort.
	 * @param {function} comparator
	 *        Function to use to compare two items.
	 * @param {Number} p
	 *        Start index of the array
	 * @param {Number} r
	 *        End index of the array
	 */
	function doQuickSort(ary, comparator, p, r) {
	  // If our lower bound is less than our upper bound, we (1) partition the
	  // array into two pieces and (2) recurse on each half. If it is not, this is
	  // the empty array and our base case.

	  if (p < r) {
	    // (1) Partitioning.
	    //
	    // The partitioning chooses a pivot between `p` and `r` and moves all
	    // elements that are less than or equal to the pivot to the before it, and
	    // all the elements that are greater than it after it. The effect is that
	    // once partition is done, the pivot is in the exact place it will be when
	    // the array is put in sorted order, and it will not need to be moved
	    // again. This runs in O(n) time.

	    // Always choose a random pivot so that an input array which is reverse
	    // sorted does not cause O(n^2) running time.
	    var pivotIndex = randomIntInRange(p, r);
	    var i = p - 1;

	    swap(ary, pivotIndex, r);
	    var pivot = ary[r];

	    // Immediately after `j` is incremented in this loop, the following hold
	    // true:
	    //
	    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
	    //
	    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
	    for (var j = p; j < r; j++) {
	      if (comparator(ary[j], pivot, false) <= 0) {
	        i += 1;
	        swap(ary, i, j);
	      }
	    }

	    swap(ary, i + 1, j);
	    var q = i + 1;

	    // (2) Recurse on each half.

	    doQuickSort(ary, comparator, p, q - 1);
	    doQuickSort(ary, comparator, q + 1, r);
	  }
	}

	  return doQuickSort;
	}

	function cloneSort(comparator) {
	  let template = SortTemplate.toString();
	  let templateFn = new Function(`return ${template}`)();
	  return templateFn(comparator);
	}

	/**
	 * Sort the given array in-place with the given comparator function.
	 *
	 * @param {Array} ary
	 *        An array to sort.
	 * @param {function} comparator
	 *        Function to use to compare two items.
	 */

	let sortCache = new WeakMap();
	quickSort.quickSort = function (ary, comparator, start = 0) {
	  let doQuickSort = sortCache.get(comparator);
	  if (doQuickSort === void 0) {
	    doQuickSort = cloneSort(comparator);
	    sortCache.set(comparator, doQuickSort);
	  }
	  doQuickSort(ary, comparator, start, ary.length - 1);
	};
	return quickSort;
}

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredSourceMapConsumer;

function requireSourceMapConsumer () {
	if (hasRequiredSourceMapConsumer) return sourceMapConsumer$1;
	hasRequiredSourceMapConsumer = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var util = requireUtil();
	var binarySearch = requireBinarySearch();
	var ArraySet = requireArraySet().ArraySet;
	var base64VLQ = requireBase64Vlq();
	var quickSort = requireQuickSort().quickSort;

	function SourceMapConsumer(aSourceMap, aSourceMapURL) {
	  var sourceMap = aSourceMap;
	  if (typeof aSourceMap === 'string') {
	    sourceMap = util.parseSourceMapInput(aSourceMap);
	  }

	  return sourceMap.sections != null
	    ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL)
	    : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
	}

	SourceMapConsumer.fromSourceMap = function(aSourceMap, aSourceMapURL) {
	  return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
	};

	/**
	 * The version of the source mapping spec that we are consuming.
	 */
	SourceMapConsumer.prototype._version = 3;

	// `__generatedMappings` and `__originalMappings` are arrays that hold the
	// parsed mapping coordinates from the source map's "mappings" attribute. They
	// are lazily instantiated, accessed via the `_generatedMappings` and
	// `_originalMappings` getters respectively, and we only parse the mappings
	// and create these arrays once queried for a source location. We jump through
	// these hoops because there can be many thousands of mappings, and parsing
	// them is expensive, so we only want to do it if we must.
	//
	// Each object in the arrays is of the form:
	//
	//     {
	//       generatedLine: The line number in the generated code,
	//       generatedColumn: The column number in the generated code,
	//       source: The path to the original source file that generated this
	//               chunk of code,
	//       originalLine: The line number in the original source that
	//                     corresponds to this chunk of generated code,
	//       originalColumn: The column number in the original source that
	//                       corresponds to this chunk of generated code,
	//       name: The name of the original symbol which generated this chunk of
	//             code.
	//     }
	//
	// All properties except for `generatedLine` and `generatedColumn` can be
	// `null`.
	//
	// `_generatedMappings` is ordered by the generated positions.
	//
	// `_originalMappings` is ordered by the original positions.

	SourceMapConsumer.prototype.__generatedMappings = null;
	Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
	  configurable: true,
	  enumerable: true,
	  get: function () {
	    if (!this.__generatedMappings) {
	      this._parseMappings(this._mappings, this.sourceRoot);
	    }

	    return this.__generatedMappings;
	  }
	});

	SourceMapConsumer.prototype.__originalMappings = null;
	Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
	  configurable: true,
	  enumerable: true,
	  get: function () {
	    if (!this.__originalMappings) {
	      this._parseMappings(this._mappings, this.sourceRoot);
	    }

	    return this.__originalMappings;
	  }
	});

	SourceMapConsumer.prototype._charIsMappingSeparator =
	  function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
	    var c = aStr.charAt(index);
	    return c === ";" || c === ",";
	  };

	/**
	 * Parse the mappings in a string in to a data structure which we can easily
	 * query (the ordered arrays in the `this.__generatedMappings` and
	 * `this.__originalMappings` properties).
	 */
	SourceMapConsumer.prototype._parseMappings =
	  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
	    throw new Error("Subclasses must implement _parseMappings");
	  };

	SourceMapConsumer.GENERATED_ORDER = 1;
	SourceMapConsumer.ORIGINAL_ORDER = 2;

	SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
	SourceMapConsumer.LEAST_UPPER_BOUND = 2;

	/**
	 * Iterate over each mapping between an original source/line/column and a
	 * generated line/column in this source map.
	 *
	 * @param Function aCallback
	 *        The function that is called with each mapping.
	 * @param Object aContext
	 *        Optional. If specified, this object will be the value of `this` every
	 *        time that `aCallback` is called.
	 * @param aOrder
	 *        Either `SourceMapConsumer.GENERATED_ORDER` or
	 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
	 *        iterate over the mappings sorted by the generated file's line/column
	 *        order or the original's source/line/column order, respectively. Defaults to
	 *        `SourceMapConsumer.GENERATED_ORDER`.
	 */
	SourceMapConsumer.prototype.eachMapping =
	  function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
	    var context = aContext || null;
	    var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

	    var mappings;
	    switch (order) {
	    case SourceMapConsumer.GENERATED_ORDER:
	      mappings = this._generatedMappings;
	      break;
	    case SourceMapConsumer.ORIGINAL_ORDER:
	      mappings = this._originalMappings;
	      break;
	    default:
	      throw new Error("Unknown order of iteration.");
	    }

	    var sourceRoot = this.sourceRoot;
	    var boundCallback = aCallback.bind(context);
	    var names = this._names;
	    var sources = this._sources;
	    var sourceMapURL = this._sourceMapURL;

	    for (var i = 0, n = mappings.length; i < n; i++) {
	      var mapping = mappings[i];
	      var source = mapping.source === null ? null : sources.at(mapping.source);
	      if(source !== null) {
	        source = util.computeSourceURL(sourceRoot, source, sourceMapURL);
	      }
	      boundCallback({
	        source: source,
	        generatedLine: mapping.generatedLine,
	        generatedColumn: mapping.generatedColumn,
	        originalLine: mapping.originalLine,
	        originalColumn: mapping.originalColumn,
	        name: mapping.name === null ? null : names.at(mapping.name)
	      });
	    }
	  };

	/**
	 * Returns all generated line and column information for the original source,
	 * line, and column provided. If no column is provided, returns all mappings
	 * corresponding to a either the line we are searching for or the next
	 * closest line that has any mappings. Otherwise, returns all mappings
	 * corresponding to the given line and either the column we are searching for
	 * or the next closest column that has any offsets.
	 *
	 * The only argument is an object with the following properties:
	 *
	 *   - source: The filename of the original source.
	 *   - line: The line number in the original source.  The line number is 1-based.
	 *   - column: Optional. the column number in the original source.
	 *    The column number is 0-based.
	 *
	 * and an array of objects is returned, each with the following properties:
	 *
	 *   - line: The line number in the generated source, or null.  The
	 *    line number is 1-based.
	 *   - column: The column number in the generated source, or null.
	 *    The column number is 0-based.
	 */
	SourceMapConsumer.prototype.allGeneratedPositionsFor =
	  function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
	    var line = util.getArg(aArgs, 'line');

	    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
	    // returns the index of the closest mapping less than the needle. By
	    // setting needle.originalColumn to 0, we thus find the last mapping for
	    // the given line, provided such a mapping exists.
	    var needle = {
	      source: util.getArg(aArgs, 'source'),
	      originalLine: line,
	      originalColumn: util.getArg(aArgs, 'column', 0)
	    };

	    needle.source = this._findSourceIndex(needle.source);
	    if (needle.source < 0) {
	      return [];
	    }

	    var mappings = [];

	    var index = this._findMapping(needle,
	                                  this._originalMappings,
	                                  "originalLine",
	                                  "originalColumn",
	                                  util.compareByOriginalPositions,
	                                  binarySearch.LEAST_UPPER_BOUND);
	    if (index >= 0) {
	      var mapping = this._originalMappings[index];

	      if (aArgs.column === undefined) {
	        var originalLine = mapping.originalLine;

	        // Iterate until either we run out of mappings, or we run into
	        // a mapping for a different line than the one we found. Since
	        // mappings are sorted, this is guaranteed to find all mappings for
	        // the line we found.
	        while (mapping && mapping.originalLine === originalLine) {
	          mappings.push({
	            line: util.getArg(mapping, 'generatedLine', null),
	            column: util.getArg(mapping, 'generatedColumn', null),
	            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
	          });

	          mapping = this._originalMappings[++index];
	        }
	      } else {
	        var originalColumn = mapping.originalColumn;

	        // Iterate until either we run out of mappings, or we run into
	        // a mapping for a different line than the one we were searching for.
	        // Since mappings are sorted, this is guaranteed to find all mappings for
	        // the line we are searching for.
	        while (mapping &&
	               mapping.originalLine === line &&
	               mapping.originalColumn == originalColumn) {
	          mappings.push({
	            line: util.getArg(mapping, 'generatedLine', null),
	            column: util.getArg(mapping, 'generatedColumn', null),
	            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
	          });

	          mapping = this._originalMappings[++index];
	        }
	      }
	    }

	    return mappings;
	  };

	sourceMapConsumer$1.SourceMapConsumer = SourceMapConsumer;

	/**
	 * A BasicSourceMapConsumer instance represents a parsed source map which we can
	 * query for information about the original file positions by giving it a file
	 * position in the generated source.
	 *
	 * The first parameter is the raw source map (either as a JSON string, or
	 * already parsed to an object). According to the spec, source maps have the
	 * following attributes:
	 *
	 *   - version: Which version of the source map spec this map is following.
	 *   - sources: An array of URLs to the original source files.
	 *   - names: An array of identifiers which can be referrenced by individual mappings.
	 *   - sourceRoot: Optional. The URL root from which all sources are relative.
	 *   - sourcesContent: Optional. An array of contents of the original source files.
	 *   - mappings: A string of base64 VLQs which contain the actual mappings.
	 *   - file: Optional. The generated file this source map is associated with.
	 *
	 * Here is an example source map, taken from the source map spec[0]:
	 *
	 *     {
	 *       version : 3,
	 *       file: "out.js",
	 *       sourceRoot : "",
	 *       sources: ["foo.js", "bar.js"],
	 *       names: ["src", "maps", "are", "fun"],
	 *       mappings: "AA,AB;;ABCDE;"
	 *     }
	 *
	 * The second parameter, if given, is a string whose value is the URL
	 * at which the source map was found.  This URL is used to compute the
	 * sources array.
	 *
	 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
	 */
	function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
	  var sourceMap = aSourceMap;
	  if (typeof aSourceMap === 'string') {
	    sourceMap = util.parseSourceMapInput(aSourceMap);
	  }

	  var version = util.getArg(sourceMap, 'version');
	  var sources = util.getArg(sourceMap, 'sources');
	  // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
	  // requires the array) to play nice here.
	  var names = util.getArg(sourceMap, 'names', []);
	  var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
	  var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
	  var mappings = util.getArg(sourceMap, 'mappings');
	  var file = util.getArg(sourceMap, 'file', null);

	  // Once again, Sass deviates from the spec and supplies the version as a
	  // string rather than a number, so we use loose equality checking here.
	  if (version != this._version) {
	    throw new Error('Unsupported version: ' + version);
	  }

	  if (sourceRoot) {
	    sourceRoot = util.normalize(sourceRoot);
	  }

	  sources = sources
	    .map(String)
	    // Some source maps produce relative source paths like "./foo.js" instead of
	    // "foo.js".  Normalize these first so that future comparisons will succeed.
	    // See bugzil.la/1090768.
	    .map(util.normalize)
	    // Always ensure that absolute sources are internally stored relative to
	    // the source root, if the source root is absolute. Not doing this would
	    // be particularly problematic when the source root is a prefix of the
	    // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
	    .map(function (source) {
	      return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
	        ? util.relative(sourceRoot, source)
	        : source;
	    });

	  // Pass `true` below to allow duplicate names and sources. While source maps
	  // are intended to be compressed and deduplicated, the TypeScript compiler
	  // sometimes generates source maps with duplicates in them. See Github issue
	  // #72 and bugzil.la/889492.
	  this._names = ArraySet.fromArray(names.map(String), true);
	  this._sources = ArraySet.fromArray(sources, true);

	  this._absoluteSources = this._sources.toArray().map(function (s) {
	    return util.computeSourceURL(sourceRoot, s, aSourceMapURL);
	  });

	  this.sourceRoot = sourceRoot;
	  this.sourcesContent = sourcesContent;
	  this._mappings = mappings;
	  this._sourceMapURL = aSourceMapURL;
	  this.file = file;
	}

	BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
	BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

	/**
	 * Utility function to find the index of a source.  Returns -1 if not
	 * found.
	 */
	BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
	  var relativeSource = aSource;
	  if (this.sourceRoot != null) {
	    relativeSource = util.relative(this.sourceRoot, relativeSource);
	  }

	  if (this._sources.has(relativeSource)) {
	    return this._sources.indexOf(relativeSource);
	  }

	  // Maybe aSource is an absolute URL as returned by |sources|.  In
	  // this case we can't simply undo the transform.
	  var i;
	  for (i = 0; i < this._absoluteSources.length; ++i) {
	    if (this._absoluteSources[i] == aSource) {
	      return i;
	    }
	  }

	  return -1;
	};

	/**
	 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
	 *
	 * @param SourceMapGenerator aSourceMap
	 *        The source map that will be consumed.
	 * @param String aSourceMapURL
	 *        The URL at which the source map can be found (optional)
	 * @returns BasicSourceMapConsumer
	 */
	BasicSourceMapConsumer.fromSourceMap =
	  function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
	    var smc = Object.create(BasicSourceMapConsumer.prototype);

	    var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
	    var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
	    smc.sourceRoot = aSourceMap._sourceRoot;
	    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
	                                                            smc.sourceRoot);
	    smc.file = aSourceMap._file;
	    smc._sourceMapURL = aSourceMapURL;
	    smc._absoluteSources = smc._sources.toArray().map(function (s) {
	      return util.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
	    });

	    // Because we are modifying the entries (by converting string sources and
	    // names to indices into the sources and names ArraySets), we have to make
	    // a copy of the entry or else bad things happen. Shared mutable state
	    // strikes again! See github issue #191.

	    var generatedMappings = aSourceMap._mappings.toArray().slice();
	    var destGeneratedMappings = smc.__generatedMappings = [];
	    var destOriginalMappings = smc.__originalMappings = [];

	    for (var i = 0, length = generatedMappings.length; i < length; i++) {
	      var srcMapping = generatedMappings[i];
	      var destMapping = new Mapping;
	      destMapping.generatedLine = srcMapping.generatedLine;
	      destMapping.generatedColumn = srcMapping.generatedColumn;

	      if (srcMapping.source) {
	        destMapping.source = sources.indexOf(srcMapping.source);
	        destMapping.originalLine = srcMapping.originalLine;
	        destMapping.originalColumn = srcMapping.originalColumn;

	        if (srcMapping.name) {
	          destMapping.name = names.indexOf(srcMapping.name);
	        }

	        destOriginalMappings.push(destMapping);
	      }

	      destGeneratedMappings.push(destMapping);
	    }

	    quickSort(smc.__originalMappings, util.compareByOriginalPositions);

	    return smc;
	  };

	/**
	 * The version of the source mapping spec that we are consuming.
	 */
	BasicSourceMapConsumer.prototype._version = 3;

	/**
	 * The list of original sources.
	 */
	Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
	  get: function () {
	    return this._absoluteSources.slice();
	  }
	});

	/**
	 * Provide the JIT with a nice shape / hidden class.
	 */
	function Mapping() {
	  this.generatedLine = 0;
	  this.generatedColumn = 0;
	  this.source = null;
	  this.originalLine = null;
	  this.originalColumn = null;
	  this.name = null;
	}

	/**
	 * Parse the mappings in a string in to a data structure which we can easily
	 * query (the ordered arrays in the `this.__generatedMappings` and
	 * `this.__originalMappings` properties).
	 */

	const compareGenerated = util.compareByGeneratedPositionsDeflatedNoLine;
	function sortGenerated(array, start) {
	  let l = array.length;
	  let n = array.length - start;
	  if (n <= 1) {
	    return;
	  } else if (n == 2) {
	    let a = array[start];
	    let b = array[start + 1];
	    if (compareGenerated(a, b) > 0) {
	      array[start] = b;
	      array[start + 1] = a;
	    }
	  } else if (n < 20) {
	    for (let i = start; i < l; i++) {
	      for (let j = i; j > start; j--) {
	        let a = array[j - 1];
	        let b = array[j];
	        if (compareGenerated(a, b) <= 0) {
	          break;
	        }
	        array[j - 1] = b;
	        array[j] = a;
	      }
	    }
	  } else {
	    quickSort(array, compareGenerated, start);
	  }
	}
	BasicSourceMapConsumer.prototype._parseMappings =
	  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
	    var generatedLine = 1;
	    var previousGeneratedColumn = 0;
	    var previousOriginalLine = 0;
	    var previousOriginalColumn = 0;
	    var previousSource = 0;
	    var previousName = 0;
	    var length = aStr.length;
	    var index = 0;
	    var temp = {};
	    var originalMappings = [];
	    var generatedMappings = [];
	    var mapping, segment, end, value;

	    let subarrayStart = 0;
	    while (index < length) {
	      if (aStr.charAt(index) === ';') {
	        generatedLine++;
	        index++;
	        previousGeneratedColumn = 0;

	        sortGenerated(generatedMappings, subarrayStart);
	        subarrayStart = generatedMappings.length;
	      }
	      else if (aStr.charAt(index) === ',') {
	        index++;
	      }
	      else {
	        mapping = new Mapping();
	        mapping.generatedLine = generatedLine;

	        for (end = index; end < length; end++) {
	          if (this._charIsMappingSeparator(aStr, end)) {
	            break;
	          }
	        }
	        aStr.slice(index, end);

	        segment = [];
	        while (index < end) {
	          base64VLQ.decode(aStr, index, temp);
	          value = temp.value;
	          index = temp.rest;
	          segment.push(value);
	        }

	        if (segment.length === 2) {
	          throw new Error('Found a source, but no line and column');
	        }

	        if (segment.length === 3) {
	          throw new Error('Found a source and line, but no column');
	        }

	        // Generated column.
	        mapping.generatedColumn = previousGeneratedColumn + segment[0];
	        previousGeneratedColumn = mapping.generatedColumn;

	        if (segment.length > 1) {
	          // Original source.
	          mapping.source = previousSource + segment[1];
	          previousSource += segment[1];

	          // Original line.
	          mapping.originalLine = previousOriginalLine + segment[2];
	          previousOriginalLine = mapping.originalLine;
	          // Lines are stored 0-based
	          mapping.originalLine += 1;

	          // Original column.
	          mapping.originalColumn = previousOriginalColumn + segment[3];
	          previousOriginalColumn = mapping.originalColumn;

	          if (segment.length > 4) {
	            // Original name.
	            mapping.name = previousName + segment[4];
	            previousName += segment[4];
	          }
	        }

	        generatedMappings.push(mapping);
	        if (typeof mapping.originalLine === 'number') {
	          let currentSource = mapping.source;
	          while (originalMappings.length <= currentSource) {
	            originalMappings.push(null);
	          }
	          if (originalMappings[currentSource] === null) {
	            originalMappings[currentSource] = [];
	          }
	          originalMappings[currentSource].push(mapping);
	        }
	      }
	    }

	    sortGenerated(generatedMappings, subarrayStart);
	    this.__generatedMappings = generatedMappings;

	    for (var i = 0; i < originalMappings.length; i++) {
	      if (originalMappings[i] != null) {
	        quickSort(originalMappings[i], util.compareByOriginalPositionsNoSource);
	      }
	    }
	    this.__originalMappings = [].concat(...originalMappings);
	  };

	/**
	 * Find the mapping that best matches the hypothetical "needle" mapping that
	 * we are searching for in the given "haystack" of mappings.
	 */
	BasicSourceMapConsumer.prototype._findMapping =
	  function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
	                                         aColumnName, aComparator, aBias) {
	    // To return the position we are searching for, we must first find the
	    // mapping for the given position and then return the opposite position it
	    // points to. Because the mappings are sorted, we can use binary search to
	    // find the best mapping.

	    if (aNeedle[aLineName] <= 0) {
	      throw new TypeError('Line must be greater than or equal to 1, got '
	                          + aNeedle[aLineName]);
	    }
	    if (aNeedle[aColumnName] < 0) {
	      throw new TypeError('Column must be greater than or equal to 0, got '
	                          + aNeedle[aColumnName]);
	    }

	    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
	  };

	/**
	 * Compute the last column for each generated mapping. The last column is
	 * inclusive.
	 */
	BasicSourceMapConsumer.prototype.computeColumnSpans =
	  function SourceMapConsumer_computeColumnSpans() {
	    for (var index = 0; index < this._generatedMappings.length; ++index) {
	      var mapping = this._generatedMappings[index];

	      // Mappings do not contain a field for the last generated columnt. We
	      // can come up with an optimistic estimate, however, by assuming that
	      // mappings are contiguous (i.e. given two consecutive mappings, the
	      // first mapping ends where the second one starts).
	      if (index + 1 < this._generatedMappings.length) {
	        var nextMapping = this._generatedMappings[index + 1];

	        if (mapping.generatedLine === nextMapping.generatedLine) {
	          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
	          continue;
	        }
	      }

	      // The last mapping for each line spans the entire line.
	      mapping.lastGeneratedColumn = Infinity;
	    }
	  };

	/**
	 * Returns the original source, line, and column information for the generated
	 * source's line and column positions provided. The only argument is an object
	 * with the following properties:
	 *
	 *   - line: The line number in the generated source.  The line number
	 *     is 1-based.
	 *   - column: The column number in the generated source.  The column
	 *     number is 0-based.
	 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
	 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
	 *     closest element that is smaller than or greater than the one we are
	 *     searching for, respectively, if the exact element cannot be found.
	 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
	 *
	 * and an object is returned with the following properties:
	 *
	 *   - source: The original source file, or null.
	 *   - line: The line number in the original source, or null.  The
	 *     line number is 1-based.
	 *   - column: The column number in the original source, or null.  The
	 *     column number is 0-based.
	 *   - name: The original identifier, or null.
	 */
	BasicSourceMapConsumer.prototype.originalPositionFor =
	  function SourceMapConsumer_originalPositionFor(aArgs) {
	    var needle = {
	      generatedLine: util.getArg(aArgs, 'line'),
	      generatedColumn: util.getArg(aArgs, 'column')
	    };

	    var index = this._findMapping(
	      needle,
	      this._generatedMappings,
	      "generatedLine",
	      "generatedColumn",
	      util.compareByGeneratedPositionsDeflated,
	      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
	    );

	    if (index >= 0) {
	      var mapping = this._generatedMappings[index];

	      if (mapping.generatedLine === needle.generatedLine) {
	        var source = util.getArg(mapping, 'source', null);
	        if (source !== null) {
	          source = this._sources.at(source);
	          source = util.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
	        }
	        var name = util.getArg(mapping, 'name', null);
	        if (name !== null) {
	          name = this._names.at(name);
	        }
	        return {
	          source: source,
	          line: util.getArg(mapping, 'originalLine', null),
	          column: util.getArg(mapping, 'originalColumn', null),
	          name: name
	        };
	      }
	    }

	    return {
	      source: null,
	      line: null,
	      column: null,
	      name: null
	    };
	  };

	/**
	 * Return true if we have the source content for every source in the source
	 * map, false otherwise.
	 */
	BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
	  function BasicSourceMapConsumer_hasContentsOfAllSources() {
	    if (!this.sourcesContent) {
	      return false;
	    }
	    return this.sourcesContent.length >= this._sources.size() &&
	      !this.sourcesContent.some(function (sc) { return sc == null; });
	  };

	/**
	 * Returns the original source content. The only argument is the url of the
	 * original source file. Returns null if no original source content is
	 * available.
	 */
	BasicSourceMapConsumer.prototype.sourceContentFor =
	  function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
	    if (!this.sourcesContent) {
	      return null;
	    }

	    var index = this._findSourceIndex(aSource);
	    if (index >= 0) {
	      return this.sourcesContent[index];
	    }

	    var relativeSource = aSource;
	    if (this.sourceRoot != null) {
	      relativeSource = util.relative(this.sourceRoot, relativeSource);
	    }

	    var url;
	    if (this.sourceRoot != null
	        && (url = util.urlParse(this.sourceRoot))) {
	      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
	      // many users. We can help them out when they expect file:// URIs to
	      // behave like it would if they were running a local HTTP server. See
	      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
	      var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
	      if (url.scheme == "file"
	          && this._sources.has(fileUriAbsPath)) {
	        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
	      }

	      if ((!url.path || url.path == "/")
	          && this._sources.has("/" + relativeSource)) {
	        return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
	      }
	    }

	    // This function is used recursively from
	    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
	    // don't want to throw if we can't find the source - we just want to
	    // return null, so we provide a flag to exit gracefully.
	    if (nullOnMissing) {
	      return null;
	    }
	    else {
	      throw new Error('"' + relativeSource + '" is not in the SourceMap.');
	    }
	  };

	/**
	 * Returns the generated line and column information for the original source,
	 * line, and column positions provided. The only argument is an object with
	 * the following properties:
	 *
	 *   - source: The filename of the original source.
	 *   - line: The line number in the original source.  The line number
	 *     is 1-based.
	 *   - column: The column number in the original source.  The column
	 *     number is 0-based.
	 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
	 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
	 *     closest element that is smaller than or greater than the one we are
	 *     searching for, respectively, if the exact element cannot be found.
	 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
	 *
	 * and an object is returned with the following properties:
	 *
	 *   - line: The line number in the generated source, or null.  The
	 *     line number is 1-based.
	 *   - column: The column number in the generated source, or null.
	 *     The column number is 0-based.
	 */
	BasicSourceMapConsumer.prototype.generatedPositionFor =
	  function SourceMapConsumer_generatedPositionFor(aArgs) {
	    var source = util.getArg(aArgs, 'source');
	    source = this._findSourceIndex(source);
	    if (source < 0) {
	      return {
	        line: null,
	        column: null,
	        lastColumn: null
	      };
	    }

	    var needle = {
	      source: source,
	      originalLine: util.getArg(aArgs, 'line'),
	      originalColumn: util.getArg(aArgs, 'column')
	    };

	    var index = this._findMapping(
	      needle,
	      this._originalMappings,
	      "originalLine",
	      "originalColumn",
	      util.compareByOriginalPositions,
	      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
	    );

	    if (index >= 0) {
	      var mapping = this._originalMappings[index];

	      if (mapping.source === needle.source) {
	        return {
	          line: util.getArg(mapping, 'generatedLine', null),
	          column: util.getArg(mapping, 'generatedColumn', null),
	          lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
	        };
	      }
	    }

	    return {
	      line: null,
	      column: null,
	      lastColumn: null
	    };
	  };

	sourceMapConsumer$1.BasicSourceMapConsumer = BasicSourceMapConsumer;

	/**
	 * An IndexedSourceMapConsumer instance represents a parsed source map which
	 * we can query for information. It differs from BasicSourceMapConsumer in
	 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
	 * input.
	 *
	 * The first parameter is a raw source map (either as a JSON string, or already
	 * parsed to an object). According to the spec for indexed source maps, they
	 * have the following attributes:
	 *
	 *   - version: Which version of the source map spec this map is following.
	 *   - file: Optional. The generated file this source map is associated with.
	 *   - sections: A list of section definitions.
	 *
	 * Each value under the "sections" field has two fields:
	 *   - offset: The offset into the original specified at which this section
	 *       begins to apply, defined as an object with a "line" and "column"
	 *       field.
	 *   - map: A source map definition. This source map could also be indexed,
	 *       but doesn't have to be.
	 *
	 * Instead of the "map" field, it's also possible to have a "url" field
	 * specifying a URL to retrieve a source map from, but that's currently
	 * unsupported.
	 *
	 * Here's an example source map, taken from the source map spec[0], but
	 * modified to omit a section which uses the "url" field.
	 *
	 *  {
	 *    version : 3,
	 *    file: "app.js",
	 *    sections: [{
	 *      offset: {line:100, column:10},
	 *      map: {
	 *        version : 3,
	 *        file: "section.js",
	 *        sources: ["foo.js", "bar.js"],
	 *        names: ["src", "maps", "are", "fun"],
	 *        mappings: "AAAA,E;;ABCDE;"
	 *      }
	 *    }],
	 *  }
	 *
	 * The second parameter, if given, is a string whose value is the URL
	 * at which the source map was found.  This URL is used to compute the
	 * sources array.
	 *
	 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
	 */
	function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
	  var sourceMap = aSourceMap;
	  if (typeof aSourceMap === 'string') {
	    sourceMap = util.parseSourceMapInput(aSourceMap);
	  }

	  var version = util.getArg(sourceMap, 'version');
	  var sections = util.getArg(sourceMap, 'sections');

	  if (version != this._version) {
	    throw new Error('Unsupported version: ' + version);
	  }

	  this._sources = new ArraySet();
	  this._names = new ArraySet();

	  var lastOffset = {
	    line: -1,
	    column: 0
	  };
	  this._sections = sections.map(function (s) {
	    if (s.url) {
	      // The url field will require support for asynchronicity.
	      // See https://github.com/mozilla/source-map/issues/16
	      throw new Error('Support for url field in sections not implemented.');
	    }
	    var offset = util.getArg(s, 'offset');
	    var offsetLine = util.getArg(offset, 'line');
	    var offsetColumn = util.getArg(offset, 'column');

	    if (offsetLine < lastOffset.line ||
	        (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
	      throw new Error('Section offsets must be ordered and non-overlapping.');
	    }
	    lastOffset = offset;

	    return {
	      generatedOffset: {
	        // The offset fields are 0-based, but we use 1-based indices when
	        // encoding/decoding from VLQ.
	        generatedLine: offsetLine + 1,
	        generatedColumn: offsetColumn + 1
	      },
	      consumer: new SourceMapConsumer(util.getArg(s, 'map'), aSourceMapURL)
	    }
	  });
	}

	IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
	IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

	/**
	 * The version of the source mapping spec that we are consuming.
	 */
	IndexedSourceMapConsumer.prototype._version = 3;

	/**
	 * The list of original sources.
	 */
	Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
	  get: function () {
	    var sources = [];
	    for (var i = 0; i < this._sections.length; i++) {
	      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
	        sources.push(this._sections[i].consumer.sources[j]);
	      }
	    }
	    return sources;
	  }
	});

	/**
	 * Returns the original source, line, and column information for the generated
	 * source's line and column positions provided. The only argument is an object
	 * with the following properties:
	 *
	 *   - line: The line number in the generated source.  The line number
	 *     is 1-based.
	 *   - column: The column number in the generated source.  The column
	 *     number is 0-based.
	 *
	 * and an object is returned with the following properties:
	 *
	 *   - source: The original source file, or null.
	 *   - line: The line number in the original source, or null.  The
	 *     line number is 1-based.
	 *   - column: The column number in the original source, or null.  The
	 *     column number is 0-based.
	 *   - name: The original identifier, or null.
	 */
	IndexedSourceMapConsumer.prototype.originalPositionFor =
	  function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
	    var needle = {
	      generatedLine: util.getArg(aArgs, 'line'),
	      generatedColumn: util.getArg(aArgs, 'column')
	    };

	    // Find the section containing the generated position we're trying to map
	    // to an original position.
	    var sectionIndex = binarySearch.search(needle, this._sections,
	      function(needle, section) {
	        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
	        if (cmp) {
	          return cmp;
	        }

	        return (needle.generatedColumn -
	                section.generatedOffset.generatedColumn);
	      });
	    var section = this._sections[sectionIndex];

	    if (!section) {
	      return {
	        source: null,
	        line: null,
	        column: null,
	        name: null
	      };
	    }

	    return section.consumer.originalPositionFor({
	      line: needle.generatedLine -
	        (section.generatedOffset.generatedLine - 1),
	      column: needle.generatedColumn -
	        (section.generatedOffset.generatedLine === needle.generatedLine
	         ? section.generatedOffset.generatedColumn - 1
	         : 0),
	      bias: aArgs.bias
	    });
	  };

	/**
	 * Return true if we have the source content for every source in the source
	 * map, false otherwise.
	 */
	IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
	  function IndexedSourceMapConsumer_hasContentsOfAllSources() {
	    return this._sections.every(function (s) {
	      return s.consumer.hasContentsOfAllSources();
	    });
	  };

	/**
	 * Returns the original source content. The only argument is the url of the
	 * original source file. Returns null if no original source content is
	 * available.
	 */
	IndexedSourceMapConsumer.prototype.sourceContentFor =
	  function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
	    for (var i = 0; i < this._sections.length; i++) {
	      var section = this._sections[i];

	      var content = section.consumer.sourceContentFor(aSource, true);
	      if (content || content === '') {
	        return content;
	      }
	    }
	    if (nullOnMissing) {
	      return null;
	    }
	    else {
	      throw new Error('"' + aSource + '" is not in the SourceMap.');
	    }
	  };

	/**
	 * Returns the generated line and column information for the original source,
	 * line, and column positions provided. The only argument is an object with
	 * the following properties:
	 *
	 *   - source: The filename of the original source.
	 *   - line: The line number in the original source.  The line number
	 *     is 1-based.
	 *   - column: The column number in the original source.  The column
	 *     number is 0-based.
	 *
	 * and an object is returned with the following properties:
	 *
	 *   - line: The line number in the generated source, or null.  The
	 *     line number is 1-based. 
	 *   - column: The column number in the generated source, or null.
	 *     The column number is 0-based.
	 */
	IndexedSourceMapConsumer.prototype.generatedPositionFor =
	  function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
	    for (var i = 0; i < this._sections.length; i++) {
	      var section = this._sections[i];

	      // Only consider this section if the requested source is in the list of
	      // sources of the consumer.
	      if (section.consumer._findSourceIndex(util.getArg(aArgs, 'source')) === -1) {
	        continue;
	      }
	      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
	      if (generatedPosition) {
	        var ret = {
	          line: generatedPosition.line +
	            (section.generatedOffset.generatedLine - 1),
	          column: generatedPosition.column +
	            (section.generatedOffset.generatedLine === generatedPosition.line
	             ? section.generatedOffset.generatedColumn - 1
	             : 0)
	        };
	        return ret;
	      }
	    }

	    return {
	      line: null,
	      column: null
	    };
	  };

	/**
	 * Parse the mappings in a string in to a data structure which we can easily
	 * query (the ordered arrays in the `this.__generatedMappings` and
	 * `this.__originalMappings` properties).
	 */
	IndexedSourceMapConsumer.prototype._parseMappings =
	  function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
	    this.__generatedMappings = [];
	    this.__originalMappings = [];
	    for (var i = 0; i < this._sections.length; i++) {
	      var section = this._sections[i];
	      var sectionMappings = section.consumer._generatedMappings;
	      for (var j = 0; j < sectionMappings.length; j++) {
	        var mapping = sectionMappings[j];

	        var source = section.consumer._sources.at(mapping.source);
	        if(source !== null) {
	          source = util.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
	        }
	        this._sources.add(source);
	        source = this._sources.indexOf(source);

	        var name = null;
	        if (mapping.name) {
	          name = section.consumer._names.at(mapping.name);
	          this._names.add(name);
	          name = this._names.indexOf(name);
	        }

	        // The mappings coming from the consumer for the section have
	        // generated positions relative to the start of the section, so we
	        // need to offset them to be relative to the start of the concatenated
	        // generated file.
	        var adjustedMapping = {
	          source: source,
	          generatedLine: mapping.generatedLine +
	            (section.generatedOffset.generatedLine - 1),
	          generatedColumn: mapping.generatedColumn +
	            (section.generatedOffset.generatedLine === mapping.generatedLine
	            ? section.generatedOffset.generatedColumn - 1
	            : 0),
	          originalLine: mapping.originalLine,
	          originalColumn: mapping.originalColumn,
	          name: name
	        };

	        this.__generatedMappings.push(adjustedMapping);
	        if (typeof adjustedMapping.originalLine === 'number') {
	          this.__originalMappings.push(adjustedMapping);
	        }
	      }
	    }

	    quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
	    quickSort(this.__originalMappings, util.compareByOriginalPositions);
	  };

	sourceMapConsumer$1.IndexedSourceMapConsumer = IndexedSourceMapConsumer;
	return sourceMapConsumer$1;
}

var sourceNode = {};

/* -*- Mode: js; js-indent-level: 2; -*- */

var hasRequiredSourceNode;

function requireSourceNode () {
	if (hasRequiredSourceNode) return sourceNode;
	hasRequiredSourceNode = 1;
	/*
	 * Copyright 2011 Mozilla Foundation and contributors
	 * Licensed under the New BSD license. See LICENSE or:
	 * http://opensource.org/licenses/BSD-3-Clause
	 */

	var SourceMapGenerator = requireSourceMapGenerator().SourceMapGenerator;
	var util = requireUtil();

	// Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
	// operating systems these days (capturing the result).
	var REGEX_NEWLINE = /(\r?\n)/;

	// Newline character code for charCodeAt() comparisons
	var NEWLINE_CODE = 10;

	// Private symbol for identifying `SourceNode`s when multiple versions of
	// the source-map library are loaded. This MUST NOT CHANGE across
	// versions!
	var isSourceNode = "$$$isSourceNode$$$";

	/**
	 * SourceNodes provide a way to abstract over interpolating/concatenating
	 * snippets of generated JavaScript source code while maintaining the line and
	 * column information associated with the original source code.
	 *
	 * @param aLine The original line number.
	 * @param aColumn The original column number.
	 * @param aSource The original source's filename.
	 * @param aChunks Optional. An array of strings which are snippets of
	 *        generated JS, or other SourceNodes.
	 * @param aName The original identifier.
	 */
	function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
	  this.children = [];
	  this.sourceContents = {};
	  this.line = aLine == null ? null : aLine;
	  this.column = aColumn == null ? null : aColumn;
	  this.source = aSource == null ? null : aSource;
	  this.name = aName == null ? null : aName;
	  this[isSourceNode] = true;
	  if (aChunks != null) this.add(aChunks);
	}

	/**
	 * Creates a SourceNode from generated code and a SourceMapConsumer.
	 *
	 * @param aGeneratedCode The generated code
	 * @param aSourceMapConsumer The SourceMap for the generated code
	 * @param aRelativePath Optional. The path that relative sources in the
	 *        SourceMapConsumer should be relative to.
	 */
	SourceNode.fromStringWithSourceMap =
	  function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
	    // The SourceNode we want to fill with the generated code
	    // and the SourceMap
	    var node = new SourceNode();

	    // All even indices of this array are one line of the generated code,
	    // while all odd indices are the newlines between two adjacent lines
	    // (since `REGEX_NEWLINE` captures its match).
	    // Processed fragments are accessed by calling `shiftNextLine`.
	    var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
	    var remainingLinesIndex = 0;
	    var shiftNextLine = function() {
	      var lineContents = getNextLine();
	      // The last line of a file might not have a newline.
	      var newLine = getNextLine() || "";
	      return lineContents + newLine;

	      function getNextLine() {
	        return remainingLinesIndex < remainingLines.length ?
	            remainingLines[remainingLinesIndex++] : undefined;
	      }
	    };

	    // We need to remember the position of "remainingLines"
	    var lastGeneratedLine = 1, lastGeneratedColumn = 0;

	    // The generate SourceNodes we need a code range.
	    // To extract it current and last mapping is used.
	    // Here we store the last mapping.
	    var lastMapping = null;

	    aSourceMapConsumer.eachMapping(function (mapping) {
	      if (lastMapping !== null) {
	        // We add the code from "lastMapping" to "mapping":
	        // First check if there is a new line in between.
	        if (lastGeneratedLine < mapping.generatedLine) {
	          // Associate first line with "lastMapping"
	          addMappingWithCode(lastMapping, shiftNextLine());
	          lastGeneratedLine++;
	          lastGeneratedColumn = 0;
	          // The remaining code is added without mapping
	        } else {
	          // There is no new line in between.
	          // Associate the code between "lastGeneratedColumn" and
	          // "mapping.generatedColumn" with "lastMapping"
	          var nextLine = remainingLines[remainingLinesIndex] || '';
	          var code = nextLine.substr(0, mapping.generatedColumn -
	                                        lastGeneratedColumn);
	          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn -
	                                              lastGeneratedColumn);
	          lastGeneratedColumn = mapping.generatedColumn;
	          addMappingWithCode(lastMapping, code);
	          // No more remaining code, continue
	          lastMapping = mapping;
	          return;
	        }
	      }
	      // We add the generated code until the first mapping
	      // to the SourceNode without any mapping.
	      // Each line is added as separate string.
	      while (lastGeneratedLine < mapping.generatedLine) {
	        node.add(shiftNextLine());
	        lastGeneratedLine++;
	      }
	      if (lastGeneratedColumn < mapping.generatedColumn) {
	        var nextLine = remainingLines[remainingLinesIndex] || '';
	        node.add(nextLine.substr(0, mapping.generatedColumn));
	        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
	        lastGeneratedColumn = mapping.generatedColumn;
	      }
	      lastMapping = mapping;
	    }, this);
	    // We have processed all mappings.
	    if (remainingLinesIndex < remainingLines.length) {
	      if (lastMapping) {
	        // Associate the remaining code in the current line with "lastMapping"
	        addMappingWithCode(lastMapping, shiftNextLine());
	      }
	      // and add the remaining lines without any mapping
	      node.add(remainingLines.splice(remainingLinesIndex).join(""));
	    }

	    // Copy sourcesContent into SourceNode
	    aSourceMapConsumer.sources.forEach(function (sourceFile) {
	      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
	      if (content != null) {
	        if (aRelativePath != null) {
	          sourceFile = util.join(aRelativePath, sourceFile);
	        }
	        node.setSourceContent(sourceFile, content);
	      }
	    });

	    return node;

	    function addMappingWithCode(mapping, code) {
	      if (mapping === null || mapping.source === undefined) {
	        node.add(code);
	      } else {
	        var source = aRelativePath
	          ? util.join(aRelativePath, mapping.source)
	          : mapping.source;
	        node.add(new SourceNode(mapping.originalLine,
	                                mapping.originalColumn,
	                                source,
	                                code,
	                                mapping.name));
	      }
	    }
	  };

	/**
	 * Add a chunk of generated JS to this source node.
	 *
	 * @param aChunk A string snippet of generated JS code, another instance of
	 *        SourceNode, or an array where each member is one of those things.
	 */
	SourceNode.prototype.add = function SourceNode_add(aChunk) {
	  if (Array.isArray(aChunk)) {
	    aChunk.forEach(function (chunk) {
	      this.add(chunk);
	    }, this);
	  }
	  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
	    if (aChunk) {
	      this.children.push(aChunk);
	    }
	  }
	  else {
	    throw new TypeError(
	      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
	    );
	  }
	  return this;
	};

	/**
	 * Add a chunk of generated JS to the beginning of this source node.
	 *
	 * @param aChunk A string snippet of generated JS code, another instance of
	 *        SourceNode, or an array where each member is one of those things.
	 */
	SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
	  if (Array.isArray(aChunk)) {
	    for (var i = aChunk.length-1; i >= 0; i--) {
	      this.prepend(aChunk[i]);
	    }
	  }
	  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
	    this.children.unshift(aChunk);
	  }
	  else {
	    throw new TypeError(
	      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
	    );
	  }
	  return this;
	};

	/**
	 * Walk over the tree of JS snippets in this node and its children. The
	 * walking function is called once for each snippet of JS and is passed that
	 * snippet and the its original associated source's line/column location.
	 *
	 * @param aFn The traversal function.
	 */
	SourceNode.prototype.walk = function SourceNode_walk(aFn) {
	  var chunk;
	  for (var i = 0, len = this.children.length; i < len; i++) {
	    chunk = this.children[i];
	    if (chunk[isSourceNode]) {
	      chunk.walk(aFn);
	    }
	    else {
	      if (chunk !== '') {
	        aFn(chunk, { source: this.source,
	                     line: this.line,
	                     column: this.column,
	                     name: this.name });
	      }
	    }
	  }
	};

	/**
	 * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
	 * each of `this.children`.
	 *
	 * @param aSep The separator.
	 */
	SourceNode.prototype.join = function SourceNode_join(aSep) {
	  var newChildren;
	  var i;
	  var len = this.children.length;
	  if (len > 0) {
	    newChildren = [];
	    for (i = 0; i < len-1; i++) {
	      newChildren.push(this.children[i]);
	      newChildren.push(aSep);
	    }
	    newChildren.push(this.children[i]);
	    this.children = newChildren;
	  }
	  return this;
	};

	/**
	 * Call String.prototype.replace on the very right-most source snippet. Useful
	 * for trimming whitespace from the end of a source node, etc.
	 *
	 * @param aPattern The pattern to replace.
	 * @param aReplacement The thing to replace the pattern with.
	 */
	SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
	  var lastChild = this.children[this.children.length - 1];
	  if (lastChild[isSourceNode]) {
	    lastChild.replaceRight(aPattern, aReplacement);
	  }
	  else if (typeof lastChild === 'string') {
	    this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
	  }
	  else {
	    this.children.push(''.replace(aPattern, aReplacement));
	  }
	  return this;
	};

	/**
	 * Set the source content for a source file. This will be added to the SourceMapGenerator
	 * in the sourcesContent field.
	 *
	 * @param aSourceFile The filename of the source file
	 * @param aSourceContent The content of the source file
	 */
	SourceNode.prototype.setSourceContent =
	  function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
	    this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
	  };

	/**
	 * Walk over the tree of SourceNodes. The walking function is called for each
	 * source file content and is passed the filename and source content.
	 *
	 * @param aFn The traversal function.
	 */
	SourceNode.prototype.walkSourceContents =
	  function SourceNode_walkSourceContents(aFn) {
	    for (var i = 0, len = this.children.length; i < len; i++) {
	      if (this.children[i][isSourceNode]) {
	        this.children[i].walkSourceContents(aFn);
	      }
	    }

	    var sources = Object.keys(this.sourceContents);
	    for (var i = 0, len = sources.length; i < len; i++) {
	      aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
	    }
	  };

	/**
	 * Return the string representation of this source node. Walks over the tree
	 * and concatenates all the various snippets together to one string.
	 */
	SourceNode.prototype.toString = function SourceNode_toString() {
	  var str = "";
	  this.walk(function (chunk) {
	    str += chunk;
	  });
	  return str;
	};

	/**
	 * Returns the string representation of this source node along with a source
	 * map.
	 */
	SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
	  var generated = {
	    code: "",
	    line: 1,
	    column: 0
	  };
	  var map = new SourceMapGenerator(aArgs);
	  var sourceMappingActive = false;
	  var lastOriginalSource = null;
	  var lastOriginalLine = null;
	  var lastOriginalColumn = null;
	  var lastOriginalName = null;
	  this.walk(function (chunk, original) {
	    generated.code += chunk;
	    if (original.source !== null
	        && original.line !== null
	        && original.column !== null) {
	      if(lastOriginalSource !== original.source
	         || lastOriginalLine !== original.line
	         || lastOriginalColumn !== original.column
	         || lastOriginalName !== original.name) {
	        map.addMapping({
	          source: original.source,
	          original: {
	            line: original.line,
	            column: original.column
	          },
	          generated: {
	            line: generated.line,
	            column: generated.column
	          },
	          name: original.name
	        });
	      }
	      lastOriginalSource = original.source;
	      lastOriginalLine = original.line;
	      lastOriginalColumn = original.column;
	      lastOriginalName = original.name;
	      sourceMappingActive = true;
	    } else if (sourceMappingActive) {
	      map.addMapping({
	        generated: {
	          line: generated.line,
	          column: generated.column
	        }
	      });
	      lastOriginalSource = null;
	      sourceMappingActive = false;
	    }
	    for (var idx = 0, length = chunk.length; idx < length; idx++) {
	      if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
	        generated.line++;
	        generated.column = 0;
	        // Mappings end at eol
	        if (idx + 1 === length) {
	          lastOriginalSource = null;
	          sourceMappingActive = false;
	        } else if (sourceMappingActive) {
	          map.addMapping({
	            source: original.source,
	            original: {
	              line: original.line,
	              column: original.column
	            },
	            generated: {
	              line: generated.line,
	              column: generated.column
	            },
	            name: original.name
	          });
	        }
	      } else {
	        generated.column++;
	      }
	    }
	  });
	  this.walkSourceContents(function (sourceFile, sourceContent) {
	    map.setSourceContent(sourceFile, sourceContent);
	  });

	  return { code: generated.code, map: map };
	};

	sourceNode.SourceNode = SourceNode;
	return sourceNode;
}

/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var hasRequiredSourceMap;

function requireSourceMap () {
	if (hasRequiredSourceMap) return sourceMap;
	hasRequiredSourceMap = 1;
	sourceMap.SourceMapGenerator = requireSourceMapGenerator().SourceMapGenerator;
	sourceMap.SourceMapConsumer = requireSourceMapConsumer().SourceMapConsumer;
	sourceMap.SourceNode = requireSourceNode().SourceNode;
	return sourceMap;
}

var sourceMapExports = requireSourceMap();

const SOURCE_MAP_PLACEHOLDER = '__SCREEPS_SOURCE_MAP__';
const STACK_LINE_PATTERN = /(main(?:\.js)?):(\d+):(\d+)/g;
let consecutiveErrors = 0;
let sourceMapConsumer;
function getConsumer() {
    if (sourceMapConsumer) {
        return sourceMapConsumer;
    }
    if (__SCREEPS_SOURCE_MAP__ === SOURCE_MAP_PLACEHOLDER) {
        return undefined;
    }
    try {
        sourceMapConsumer = new sourceMapExports.SourceMapConsumer(JSON.parse(__SCREEPS_SOURCE_MAP__));
    }
    catch (error) {
        console.log(`[error-mapper] Failed to load source map: ${String(error)}`);
    }
    return sourceMapConsumer;
}
function mapStackTrace(stack) {
    const consumer = getConsumer();
    if (!consumer) {
        return stack;
    }
    return stack.replace(STACK_LINE_PATTERN, (_match, fileName, line, column) => {
        const original = consumer.originalPositionFor({
            line: Number(line),
            column: Number(column),
        });
        if (!original.source || original.line == null || original.column == null) {
            return `${fileName}:${line}:${column}`;
        }
        return `${original.source}:${original.line}:${original.column}`;
    });
}
function haltVm() {
    const haltableCpu = Game.cpu;
    if (typeof haltableCpu.halt === 'function') {
        haltableCpu.halt();
    }
}
const Watchdog = {
    get consecutiveErrors() {
        return consecutiveErrors;
    },
    reset() {
        consecutiveErrors = 0;
    },
    record(error) {
        consecutiveErrors += 1;
        const stack = error instanceof Error ? error.stack ?? error.message : String(error);
        console.log(mapStackTrace(stack));
        if (consecutiveErrors >= 3) {
            console.log(`[watchdog] Halting VM after ${consecutiveErrors} consecutive loop failures.`);
            haltVm();
        }
    },
};
class ErrorMapper {
    static wrapLoop(loop) {
        return () => {
            try {
                loop();
            }
            catch (error) {
                Watchdog.record(error);
            }
        };
    }
}

function preTick() {
    SegmentManager.preTick();
    SegmentManager.pruneCostMatrices();
    Mem.ensureRoots();
    Mem.pruneDeadCreeps();
}
function build() {
    const empire = Empire.get();
    empire.refresh();
    return empire;
}
function init(empire) {
    empire.init();
}
function run(empire) {
    empire.run();
}
function postRun(empire) {
    empire.postRun();
    SegmentManager.postTick();
    if (Game.cpu.bucket === 10000 && typeof Game.cpu.generatePixel === 'function') {
        Game.cpu.generatePixel();
    }
}
function watchdog() {
    Watchdog.reset();
}
const loop = ErrorMapper.wrapLoop(() => {
    preTick();
    const empire = build();
    init(empire);
    run(empire);
    postRun(empire);
    watchdog();
});

exports.loop = loop;
//# sourceMappingURL=main.js.map
