import { model, Schema } from 'mongoose'

export interface IFile {
    document: string
    type: string
    data: unknown
}

const schema = new Schema<IFile>(
    {
        document: { type: String, required: true },
        type: { type: String, required: true },
        data: { type: Schema.Types.Mixed, required: true },
    },
    {
        collection: 'file',
        timestamps: true,
    }
)

export const File = model<IFile>('File', schema)
