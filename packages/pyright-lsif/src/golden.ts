import { Index, Metadata_PositionEncoding } from "./lsif";

const exampleIndex: Index = {
  metadata: {
    toolInfo: undefined,
    projectRoot: "/home/tjdevries/tmp/pyxample/",
    positionEncoding: Metadata_PositionEncoding.POSITION_ENCODING_UTF16,
  },

  document: [],
  package: [],
  externalSymbols: [],
};

function generate(index: Index): string {
  for (const doc of index.document) {
    console.log(doc);
  }

  return "hello";
}
