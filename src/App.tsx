import React from 'react';
import {BrowserRouter, Routes, Route} from "react-router-dom";
import {Gating} from "./Gating";
import {UploadFiles} from "./transforms/UploadFiles";
import {DonorSelection} from "./DonorSelection";


function App() {

    return (
        <BrowserRouter>
            <Routes>
                <Route path='/' element={<Gating/>}/>
                <Route path='/transform' element={<UploadFiles/>}/>
                <Route path='/donor-selection' element={<DonorSelection/>}/>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
