import { Indexer } from "./indexer";
import { lib } from "./lsif";

export const lsif_typed = lib.codeintel.lsif_typed

export interface Options {
  projectRoot: string
  project: string
  writeIndex: (index: lib.codeintel.lsif_typed.Index) => void
}

export function index(options: Options) {
  new Indexer({}, options).index()
}
