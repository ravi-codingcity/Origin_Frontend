import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Add_origin from "./pages/Add_origin";
import Login from "./pages/Login";
import View_origin from "./pages/View_origin";
import Import_Export from "./pages/Import_Export";
import Under_production from "./pages/Under_production";
import View_rail_freight from "./pages/View_rail_freight";
import Add_rail_freight from "./pages/Add_rail_freight";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/export/view_origin" element={<View_origin />} />
        <Route path="/import_export" element={<Import_Export />} />
        <Route path="/export/add_origin" element={<Add_origin />} />
        <Route path="/import/under_production" element={<Under_production />} />
        <Route
          path="/export/view_rail_freight"
          element={<View_rail_freight />}
        />
        <Route path="/export/Add_rail_freight" element={<Add_rail_freight />} />
      </Routes>
    </Router>
  );
};

export default App;
