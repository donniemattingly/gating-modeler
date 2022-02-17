import {useDropzone} from "react-dropzone";
import {useCallback, useEffect, useRef, useState} from "react";
import {useStoreActions, useStoreState} from "easy-peasy";
import {StoreModel} from "../stores/main";
import {saveAs} from 'file-saver';
import {convertFiles} from "../stores/transforms";

const DonorOption = (props: { name: string }) => {
    const {name} = props;
    return <div>
        {name}
    </div>
}

export const UploadFiles = () => {
    const files: File[] = useStoreState<StoreModel>(state => state.transforms.files);
    const rowFormat: string[] = useStoreState<StoreModel>(state => state.transforms.rowFormat);
    const setRowFormatFromString = useStoreActions<StoreModel>((actions => actions.transforms.setRowFormatFromString));
    const donors: string[] = useStoreState<StoreModel>(state => state.transforms.donors);
    const suffixes: string[] = useStoreState<StoreModel>(state => state.transforms.suffixes);
    const readFile = useStoreActions<StoreModel>(actions => actions.transforms.readFile);
    const rowFormatStringRef = useRef<HTMLPreElement>(null);

    const [converting, setConverting] = useState(false);
    const [download, setDownload] = useState<Blob | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        for (const file of acceptedFiles) {
            readFile(file)
        }
    }, [files])
    const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop})

    const transformData = async () => {
        const rowFormat = rowFormatStringRef?.current?.innerHTML.split('\n')
        if (rowFormat) {
            setConverting(true);
            const result = await convertFiles(files, {rowFormat});
            setDownload(result);
            setConverting(false);
        }
    }

    const downloadClicked = () => {
        if (download != null) {
            saveAs(download, `output-${(new Date()).toISOString()}.zip`);
        }
    }

    return (
        <div className="m-auto flex flex-col items-center">
            <div {...getRootProps()}
                 className="w-10/12 mt-10 m-auto bg-slate-500 h-80 rounded-xl grid place-items-center">
                <input {...getInputProps()}/>
                <h1 className="font-bold text-4xl text-white"> Drop all your files here</h1>
            </div>
            <div className="grid grid-cols-2 w-10/12 m-auto">
                <div>
                    <h3 className="text-center"> Output Row Formats (edit accordingly) </h3>
                    <pre ref={rowFormatStringRef} contentEditable={true} suppressContentEditableWarning={true}>
                        {rowFormat.join('\n')}
                    </pre>
                </div>
                <div>
                    <h3 className="text-center"> Uploaded Files </h3>
                    {files.map(it => <div key={it.name}>
                        {it.name}
                    </div>)}
                </div>
            </div>
            <div>
                <button className="bg-slate-500 rounded-lg p-3 text-slate-50"
                        onClick={transformData}>
                    Transform Data
                </button>
                {download !== null
                    ? <button className="bg-slate-500 rounded-lg p-3 text-slate-50"
                              onClick={downloadClicked}>
                        Download
                    </button>
                    : null
                }
            </div>
        </div>
    )
}