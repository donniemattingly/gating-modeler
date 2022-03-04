import {useStoreActions, useStoreState} from "easy-peasy";
import {StoreModel} from "./stores/main";
import {useCallback, useEffect, useState} from "react";
import {readFileAsDonorData} from "./stores/transforms";
import {useDropzone} from "react-dropzone";
import React from 'react'
import styled from 'styled-components'
import {TableOptions, useTable} from 'react-table'

export const DonorSelection = () => {
    const files = useStoreState<StoreModel>(state => state.transforms.files)
    const donorData = useStoreState<StoreModel>(state => state.transforms.donorData);
    const parseDonorData = useStoreActions<StoreModel>(actions => actions.transforms.parseDonorData);
    const readFile = useStoreActions<StoreModel>(actions => actions.transforms.readFile);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        for (const file of acceptedFiles) {
            await readFile(file)
        }

        await parseDonorData();
    }, [files])
    const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop})

    const columns = React.useMemo(
        () => [
            {
                Header: 'Name',
                columns: [
                    {
                        Header: 'First Name',
                        accessor: 'firstName',
                    },
                    {
                        Header: 'Last Name',
                        accessor: 'lastName',
                    },
                ],
            },
            {
                Header: 'Info',
                columns: [
                    {
                        Header: 'Age',
                        accessor: 'age',
                    },
                    {
                        Header: 'Visits',
                        accessor: 'visits',
                    },
                    {
                        Header: 'Status',
                        accessor: 'status',
                    },
                    {
                        Header: 'Profile Progress',
                        accessor: 'progress',
                    },
                ],
            },
        ],
        []
    )

    const data = React.useMemo(() => Object.values(donorData), [donorData])

    return (
        <div className="m-auto flex flex-col items-center w-10/12">
            {files.length === 0
                ? <div {...getRootProps()}
                       className="w-full mt-10 m-auto bg-slate-500 h-80 rounded-xl grid place-items-center">
                    <input {...getInputProps()}/>
                    <h1 className="font-bold text-4xl text-white"> Drop all your files here</h1>
                </div>
                : <pre>
                    {JSON.stringify(donorData, null, 2)}
                </pre>
            }

            <Styles>
                <Table columns={columns} data={data} />
            </Styles>
        </div>
    )
}


const Styles = styled.div`
  padding: 1rem;

  table {
    border-spacing: 0;
    border: 1px solid black;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;

      :last-child {
        border-right: 0;
      }
    }
  }
`

function Table({ columns, data }: TableOptions<any>) {
    // Use the state and functions returned from useTable to build your UI
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
    } = useTable({
        columns,
        data,
    })

    // Render the UI for your table
    return (
        <table {...getTableProps()}>
            <thead>
            {headerGroups.map(headerGroup => (
                <tr {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map(column => (
                        <th {...column.getHeaderProps()}>{column.render('Header')}</th>
                    ))}
                </tr>
            ))}
            </thead>
            <tbody {...getTableBodyProps()}>
            {rows.map((row, i) => {
                prepareRow(row)
                return (
                    <tr {...row.getRowProps()}>
                        {row.cells.map(cell => {
                            return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                        })}
                    </tr>
                )
            })}
            </tbody>
        </table>
    )
}
