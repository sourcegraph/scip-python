import { WriteStream } from 'fs';
import { DefinitionResult, Document, ElementTypes, MetaData, Range, VertexLabels, VertexLabels } from 'lsif-protocol';
import { Position } from 'pyright-internal/common/textRange';

// TODO: This might need to be threadsafe at some point?
let _id = 0;
function nextID(): number {
    _id = _id + 1;
    return _id;
}

export class Emitter {
    constructor(private writer: WriteStream) {
      this.EmitMetadata();
    }

    private write(obj: any) {
        this.writer.write(JSON.stringify(obj) + '\n');
    }

    EmitMetadata(): void {
        let metadata = {
            id: nextID(),
            label: VertexLabels.metaData,
            version: '0.5.0',
            positionEncoding: 'utf-16',
            type: ElementTypes.vertex,
        };

        this.write(metadata);
    }

    EmitDocument(uri: string): number {
        let doc = {
            id: nextID(),
            languageId: 'python',
            label: VertexLabels.document,
            type: ElementTypes.vertex,
            uri,
        };

        this.write(doc);
        return doc.id;
    }

    EmitRange(start: Position, end: Position): number {
        let id = nextID();
        this.write({
            id,
            label: VertexLabels.range,
            type: ElementTypes.vertex,
            start,
            end,
        });

        return id;
    }

    EmitDefinitionResult(): number {
        let id = nextID();
        this.write({
            id: id,
            label: VertexLabels.definitionResult,
            type: ElementTypes.vertex,
        });

        return id;
    }
}
