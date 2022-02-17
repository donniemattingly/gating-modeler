import React from 'react';
import {BrowserRouter, Routes, Route} from "react-router-dom";
import {Gating} from "./Gating";
import {UploadFiles} from "./transforms/UploadFiles";


function App() {

    return (
        <BrowserRouter>
            <Routes>
                <Route path='/' element={<Gating/>}/>
                <Route path='/transform' element={<UploadFiles/>}/>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
