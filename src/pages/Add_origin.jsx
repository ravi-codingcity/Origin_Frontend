import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { usePOROptions } from "../components/POR";
import { usePOLOptions } from "../components/POL";
import { useContainerTypeOptions } from "../components/Container_type";
import { useShippingLinesOptions } from "../components/Shipping_lines";

const Add_origin = () => {
  // Get POR options using the custom hook
  const {
    options: porOptions,
    loading: porLoading,
    error: porError,
  } = usePOROptions();

  // Get POL options using the custom hook
  const {
    options: polOptions,
    loading: polLoading,
    error: polError,
  } = usePOLOptions();

  // Get Container Type options using the custom hook
  const {
    options: containerTypeOptions,
    loading: containerTypeLoading,
    error: containerTypeError,
  } = useContainerTypeOptions();

  // Get Shipping Lines options using the custom hook
  const {
    options: shippingLinesOptions,
    loading: shippingLinesLoading,
    error: shippingLinesError,
  } = useShippingLinesOptions();

  // Currency symbols mapping - Fix mapping to use correct format
  const currencySymbols = {
    "₹": "INR",
    $: "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
  };

  // Initialize form data with proper structure
  const [formData, setFormData] = useState({
    name: "",
    por: "",
    pol: "",
    container_type: "",
    shipping_lines: "",
    // Initialize with currency property for backward compatibility
    bl_fees: { value: "", currency: "₹" },
    thc: { value: "", currency: "₹" },
    muc: { value: "", currency: "₹" },
    toll: { value: "", currency: "₹" },
  });

  // State for storing fetched data
  const [shipmentData, setShipmentData] = useState([]);

  // Add state for error messages
  const [errorMessage, setErrorMessage] = useState("");

  // Add state for edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(30);

  // Add states for loading and success messages
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Check if this is a cost field
    if (["bl_fees", "thc", "muc", "toll"].includes(name)) {
      setFormData((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          value: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle currency change for a specific cost field
  const handleCurrencyChange = (field, currency) => {
    setFormData((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        currency,
      },
    }));
  };

  // Handle edit button click
  const handleEditClick = (record) => {
    setEditingRecord({ ...record });
    setIsEditModalOpen(true);
  };

  // Handle edit form change
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditingRecord((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Show success toast with auto-dismiss
  const displaySuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);
  };

  // Handle form submission with loading state
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear any previous errors
    setIsSubmitting(true); // Start loading animation

    // Validate form before submission
    if (
      !formData.por ||
      !formData.pol ||
      !formData.container_type ||
      !formData.shipping_lines
    ) {
      setErrorMessage("Please fill in all required fields");
      setIsSubmitting(false);
      return;
    }

    // Create a copy for API submission - format data to match API expectations
    let formDataToSend;

    try {
      // First attempt: Try sending with the new structure (if backend supports it)
      formDataToSend = {
        name: formData.name, // Include name in the submission
        por: formData.por,
        pol: formData.pol,
        container_type: formData.container_type,
        shipping_lines: formData.shipping_lines,
        bl_fees: {
          value: parseFloat(formData.bl_fees.value) || 0,
          currency: formData.bl_fees.currency,
        },
        thc: {
          value: parseFloat(formData.thc.value) || 0,
          currency: formData.thc.currency,
        },
        muc: {
          value: parseFloat(formData.muc.value) || 0,
          currency: formData.muc.currency,
        },
        toll: {
          value: parseFloat(formData.toll.value) || 0,
          currency: formData.toll.currency,
        },
      };

      console.log("Submitting form data:", formDataToSend);

      const response = await fetch(
        "https://origin-backend-3v3f.onrender.com/api/origin/forms/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify(formDataToSend),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(
          `Server error: ${response.status} - ${errorText || "Unknown error"}`
        );
      }

      // Reset form on success
      setFormData({
        name: formData.name, // Preserve the pre-filled name
        por: "",
        pol: "",
        container_type: "",
        shipping_lines: "",
        bl_fees: { value: "", currency: "₹" },
        thc: { value: "", currency: "₹" },
        muc: { value: "", currency: "₹" },
        toll: { value: "", currency: "₹" },
      });

      // Fetch updated data
      fetchShipmentData();

      // Show success message
      displaySuccessMessage("Entry saved successfully!");
    } catch (error) {
      console.error("Form submission error:", error);

      // Try alternative format if the first attempt failed (backward compatibility)
      try {
        console.log("Trying alternative form format...");

        formDataToSend = {
          name: formData.name, // Include name in the alternative format too
          por: formData.por,
          pol: formData.pol,
          container_type: formData.container_type,
          shipping_lines: formData.shipping_lines,
          // Simplified format with just numeric values
          bl_fees: parseFloat(formData.bl_fees.value) || 0,
          thc: parseFloat(formData.thc.value) || 0,
          muc: parseFloat(formData.muc.value) || 0,
          toll: parseFloat(formData.toll.value) || 0,

          // Add currency as a separate field for backward compatibility
          currency: formData.bl_fees.currency || "$",
        };

        console.log("Attempting with alternative format:", formDataToSend);

        const response = await fetch(
          "https://origin-backend-3v3f.onrender.com/api/origin/forms/create",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + localStorage.getItem("token"),
            },
            body: JSON.stringify(formDataToSend),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Server error: ${response.status} - ${errorText || "Unknown error"}`
          );
        }

        // Reset form after successful submission
        setFormData({
          name: formData.name, // Preserve the pre-filled name
          por: "",
          pol: "",
          container_type: "",
          shipping_lines: "",
          bl_fees: { value: "", currency: "₹" },
          thc: { value: "", currency: "₹" },
          muc: { value: "", currency: "₹" },
          toll: { value: "", currency: "₹" },
        });

        // Fetch updated data
        fetchShipmentData();

        // Show success message
        displaySuccessMessage("Entry saved successfully!");
      } catch (fallbackError) {
        console.error("Both submission attempts failed:", fallbackError);
        setErrorMessage(`Form submission failed: ${fallbackError.message}`);
      }
    } finally {
      setIsSubmitting(false); // End loading animation
    }
  };

  // Handle edit form submission with loading state
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsUpdating(true); // Start loading animation

    // Check if we have a valid ID
    const recordId = editingRecord._id || editingRecord.id;
    if (!recordId) {
      setErrorMessage("Cannot update record: Missing ID");
      setIsUpdating(false);
      return;
    }

    // Get token
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Authentication required. Please log in again.");
      setIsUpdating(false);
      return;
    }

    // Ensure proper structure for the editingRecord before submission to match backend expectations
    const prepareEditingRecord = () => {
      const fields = ["bl_fees", "thc", "muc", "toll"];
      const record = { ...editingRecord };

      // Store a common currency for all fields
      let commonCurrency = "₹";

      // Extract currency from the first available field
      for (const field of fields) {
        if (
          record[field] &&
          typeof record[field] === "object" &&
          record[field].currency
        ) {
          commonCurrency = record[field].currency;
          break;
        }
      }

      // Set the common currency field
      record.currency = commonCurrency;

      // Convert all cost fields to simple numbers
      fields.forEach((field) => {
        if (
          record[field] &&
          typeof record[field] === "object" &&
          record[field].hasOwnProperty("value")
        ) {
          // Extract numeric value from object
          record[field] = parseFloat(record[field].value) || 0;
        } else if (record[field] !== undefined) {
          // Ensure numeric value if it's already a simple type
          record[field] = parseFloat(record[field]) || 0;
        } else {
          // Default value if missing
          record[field] = 0;
        }
      });

      return record;
    };

    const updatedRecord = prepareEditingRecord();
    console.log("Sending updated record:", updatedRecord);

    try {
      const response = await fetch(
        `https://origin-backend-3v3f.onrender.com/api/origin/forms/${recordId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(updatedRecord),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Update API error response:", errorText);
        throw new Error(
          `Server error: ${response.status} - ${errorText || "Unknown error"}`
        );
      }

      setIsEditModalOpen(false);
      setEditingRecord(null);
      fetchShipmentData();

      // Show success message
      displaySuccessMessage("Entry updated successfully!");
    } catch (error) {
      console.error("Error updating record:", error);
      setErrorMessage(`Failed to update record: ${error.message}`);
    } finally {
      setIsUpdating(false); // End loading animation
    }
  };

  // Fetch shipment data with console.log to inspect response structure
  const fetchShipmentData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        "https://origin-backend-3v3f.onrender.com/api/origin/forms/user",
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      console.log("API Response Data:", data); // Debug API response
      setShipmentData(data);
      setCurrentPage(1); // Reset to first page when new data is loaded
      displaySuccessMessage("Data refreshed successfully");
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage(`Failed to refresh data: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch data on component mount and get user info from localStorage
  useEffect(() => {
    fetchShipmentData();

    // Get user info from localStorage
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo")) || {};
      const username =
        userInfo.name ||
        userInfo.username ||
        localStorage.getItem("username") ||
        "";

      // Pre-fill the name field with the username from localStorage
      setFormData((prev) => ({
        ...prev,
        name: username,
      }));
    } catch (error) {
      console.error("Error parsing user info from localStorage:", error);
    }
  }, []);

  // Sort and paginate data
  const sortedData = [...shipmentData].sort((a, b) => {
    // Sort by createdAt date in descending order (newest first)
    return (
      new Date(b.createdAt || b.updatedAt || 0) -
      new Date(a.createdAt || a.updatedAt || 0)
    );
  });

  // Get current entries for pagination
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = sortedData.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(sortedData.length / entriesPerPage);

  // Function to change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-800">
           Add Origin/Local Charges
          </h1>
          <button
            onClick={fetchShipmentData}
            disabled={isRefreshing}
            className={`bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md flex items-center text-xs transition-colors ${
              isRefreshing ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
          

            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-3.5 w-3.5 mr-1 ${
                isRefreshing ? "animate-spin" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>

            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Display error messages */}
        {errorMessage && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 mb-4 rounded-md text-sm">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                <strong>Error:</strong> {errorMessage}
              </span>
            </div>
          </div>
        )}

        {/* Success message toast */}
        {showSuccessToast && (
          <div className="fixed top-4 right-4 flex max-w-sm w-full mx-auto overflow-hidden bg-white rounded-lg shadow-md z-50 animate-fade-in-down">
            <div className="flex items-center justify-center w-12 bg-green-500">
              <svg
                className="w-6 h-6 text-white fill-current"
                viewBox="0 0 40 40"
              >
                <path d="M20 3.33331C10.8 3.33331 3.33337 10.8 3.33337 20C3.33337 29.2 10.8 36.6666 20 36.6666C29.2 36.6666 36.6667 29.2 36.6667 20C36.6667 10.8 29.2 3.33331 20 3.33331ZM16.6667 28.3333L8.33337 20L10.6834 17.65L16.6667 23.6166L29.3167 10.9666L31.6667 13.3333L16.6667 28.3333Z"></path>
              </svg>
            </div>
            <div className="px-4 py-2 -mx-3">
              <div className="mx-3">
                <span className="font-semibold text-green-500">Success</span>
                <p className="text-sm text-gray-600">{successMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="p-2 text-gray-400 hover:text-gray-500"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Compact Form Card */}
        <div className="bg-white shadow-sm rounded-md overflow-hidden mb-4 border border-gray-200">
          <div className="bg-blue-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                Please enter new charge details and ensure timely updates.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            {/* Location & Shipment Details - Combined into one row */}
            <div className="mb-3">
              <h3 className="text-sm font-medium text-red-600 mb-2 pb-1 border-b border-gray-200">
                Shipment Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* POR */}
                <div>
                  <label
                    className="block text-black text-xs font-medium mb-1"
                    htmlFor="POR"
                  >
                    Place of Receipt (POR)
                  </label>
                  {porLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
                  ) : porError ? (
                    <div className="text-red-500 text-xs mb-1">
                      Error: {porError}
                    </div>
                  ) : (
                    <select
                      required
                      className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 px-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      id="POR"
                      name="por"
                      value={formData.por}
                      onChange={handleChange}
                    >
                      <option value="">Select POR</option>
                      {porOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* POL */}
                <div>
                  <label
                    className="block text-black text-xs font-medium mb-1"
                    htmlFor="POL"
                  >
                    Port of Loading (POL)
                  </label>
                  {polLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
                  ) : polError ? (
                    <div className="text-red-500 text-xs mb-1">
                      Error: {polError}
                    </div>
                  ) : (
                    <select
                      required
                      className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 px-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      id="POL"
                      name="pol"
                      value={formData.pol}
                      onChange={handleChange}
                    >
                      <option value="">Select POL</option>
                      {polOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Container Type */}
                <div>
                  <label
                    className="block text-black text-xs font-medium mb-1"
                    htmlFor="containerType"
                  >
                    Container Type
                  </label>
                  {containerTypeLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
                  ) : containerTypeError ? (
                    <div className="text-red-500 text-xs mb-1">
                      Error: {containerTypeError}
                    </div>
                  ) : (
                    <select
                      required
                      className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 px-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      id="containerType"
                      name="container_type"
                      value={formData.container_type}
                      onChange={handleChange}
                    >
                      <option value="">Select Container</option>
                      {containerTypeOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Shipping Line */}
                <div>
                  <label
                    className="block text-black text-xs font-medium mb-1"
                    htmlFor="shippingLine"
                  >
                    Shipping Line
                  </label>
                  {shippingLinesLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
                  ) : shippingLinesError ? (
                    <div className="text-red-500 text-xs mb-1">
                      Error: {shippingLinesError}
                    </div>
                  ) : (
                    <select
                      required
                      className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 px-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      id="shippingLine"
                      name="shipping_lines"
                      value={formData.shipping_lines}
                      onChange={handleChange}
                    >
                      <option value="">Select Line</option>
                      {shippingLinesOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Cost Information */}
            <div className="mb-3">
              <h3 className="text-sm font-medium text-red-600 mb-2 pb-1 border-b border-gray-200">
                Cost Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {/* Username */}
                <div className="hidden">
                  <label
                    className="block text-gray-700 text-xs font-medium mb-1"
                    htmlFor="name"
                  >
                    Username
                  </label>
                  <div className="relative flex">
                    <input
                      required
                      className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 px-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      readOnly
                    />
                  </div>
                </div>

                {/* BL Fees */}
                <div>
                  <label
                    className="block text-black text-xs font-medium mb-1"
                    htmlFor="BLFees"
                  >
                    BL Fees (Per BL)
                  </label>
                  <div className="relative flex">
                    <select
                      className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1"
                      value={formData.bl_fees.currency}
                      onChange={(e) =>
                        handleCurrencyChange("bl_fees", e.target.value)
                      }
                    >
                      {Object.entries(currencySymbols).map(([symbol, code]) => (
                        <option key={code} value={symbol}>
                          {symbol}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 pl-10 pr-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      id="BLFees"
                      type="number"
                      name="bl_fees"
                      value={formData.bl_fees.value}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* THC */}
                <div>
                  <label
                    className="block text-black text-xs font-medium mb-1"
                    htmlFor="THC"
                  >
                    THC (Per Container)
                  </label>
                  <div className="relative flex">
                    <select
                      className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1"
                      value={formData.thc.currency}
                      onChange={(e) =>
                        handleCurrencyChange("thc", e.target.value)
                      }
                    >
                      {Object.entries(currencySymbols).map(([symbol, code]) => (
                        <option key={code} value={symbol}>
                          {symbol}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 pl-10 pr-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      id="THC"
                      type="number"
                      name="thc"
                      value={formData.thc.value}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* MUC */}
                <div>
                  <label
                    className="block text-black text-xs font-medium mb-1"
                    htmlFor="MUC"
                  >
                    MUC (Per BL)
                  </label>
                  <div className="relative flex">
                    <select
                      className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1"
                      value={formData.muc.currency}
                      onChange={(e) =>
                        handleCurrencyChange("muc", e.target.value)
                      }
                    >
                      {Object.entries(currencySymbols).map(([symbol, code]) => (
                        <option key={code} value={symbol}>
                          {symbol}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 pl-10 pr-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      id="MUC"
                      type="number"
                      name="muc"
                      value={formData.muc.value}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* TOLL */}
                <div>
                  <label
                    className="block text-black text-xs font-medium mb-1"
                    htmlFor="TOLL"
                  >
                    TOLL (Per Container)
                  </label>
                  <div className="relative flex">
                    <select
                      className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1"
                      value={formData.toll.currency}
                      onChange={(e) =>
                        handleCurrencyChange("toll", e.target.value)
                      }
                    >
                      {Object.entries(currencySymbols).map(([symbol, code]) => (
                        <option key={code} value={symbol}>
                          {symbol}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 pl-10 pr-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      id="TOLL"
                      type="number"
                      name="toll"
                      value={formData.toll.value}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors flex items-center ${
                  isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Add Charges
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Origin/Local Charges Details Table - with pagination */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <div className="bg-blue-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Origin/Local Charges Details
            </h2>
            <div className="flex items-center">
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mr-2">
                {shipmentData.length} Records
              </span>
              <span className="text-gray-500 text-xs">
                Showing {currentEntries.length > 0 ? indexOfFirstEntry + 1 : 0}{" "}
                to {Math.min(indexOfLastEntry, shipmentData.length)} of{" "}
                {shipmentData.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4 text-left border-r border-gray-200">User</th>
                  <th className="py-3 px-4 text-left border-r border-gray-200">POR</th>
                  <th className="py-3 px-4 text-left border-r border-gray-200">POL</th>
                  <th className="py-3 px-4 text-left border-r border-gray-200">Container Type</th>
                  <th className="py-3 px-4 text-left border-r border-gray-200">Shipping Line</th>
                  <th className="py-3 px-4 text-right border-r border-gray-200">BL Fees</th>
                  <th className="py-3 px-4 text-right border-r border-gray-200">THC</th>
                  <th className="py-3 px-4 text-right border-r border-gray-200">MUC</th>
                  <th className="py-3 px-4 text-right border-r border-gray-200">TOLL</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentEntries.length > 0 ? (
                  currentEntries.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm text-red-600 font-medium border-r border-gray-200">
                        {(() => {
                          // Debug the structure of each row to see available fields
                          console.log("Row data for username:", row);

                          // Try multiple possible locations for the username in API response
                          if (row.name) return row.name;
                          if (row.userName) return row.userName;
                          if (row.createdBy) return row.createdBy;

                          // Check if name is in user object
                          if (row.user) {
                            if (typeof row.user === "object") {
                              if (row.user.name) return row.user.name;
                              if (row.user.username) return row.user.username;
                              if (row.user.email) return row.user.email;
                              return "User";
                            }
                            return row.user;
                          }

                          // If all else fails, try to get name from localStorage
                          try {
                            const userInfo =
                              JSON.parse(localStorage.getItem("userInfo")) ||
                              {};
                            const username =
                              userInfo.name ||
                              userInfo.username ||
                              localStorage.getItem("username");
                            return username || "Unknown User";
                          } catch (e) {
                            return "Unknown";
                          }
                        })()}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 border-r border-gray-200">
                        {row.por}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 border-r border-gray-200">
                        {row.pol}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 border-r border-gray-200">
                        {row.container_type}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 border-r border-gray-200">
                        {row.shipping_lines}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                        {typeof row.bl_fees === "object" && row.bl_fees !== null
                          ? `${row.bl_fees.currency || "$"} ${
                              row.bl_fees.value
                            }`
                          : `${row.currency || "$"} ${row.bl_fees}`}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                        {typeof row.thc === "object" && row.thc !== null
                          ? `${row.thc.currency || "$"} ${row.thc.value}`
                          : `${row.currency || "$"} ${row.thc}`}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                        {typeof row.muc === "object" && row.muc !== null
                          ? `${row.muc.currency || "$"} ${row.muc.value}`
                          : `${row.currency || "$"} ${row.muc}`}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                        {typeof row.toll === "object" && row.toll !== null
                          ? `${row.toll.currency || "$"} ${row.toll.value}`
                          : `${row.currency || "$"} ${row.toll}`}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleEditClick(row)}
                          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium py-1 px-3 rounded-md text-xs transition-colors inline-flex items-center"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-8 px-6 text-center text-sm text-gray-500"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-10 w-10 text-gray-300 mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                        <p>No data available yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Add your first origin charge using the form above
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add pagination controls */}
          {shipmentData.length > entriesPerPage && (
            <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">{indexOfFirstEntry + 1}</span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(indexOfLastEntry, shipmentData.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">{shipmentData.length}</span>{" "}
                    results
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === 1
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }).map(
                      (_, i) => {
                        let pageNumber;

                        // Calculate which page numbers to show (centered around current page)
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNumber}
                            onClick={() => paginate(pageNumber)}
                            aria-current={
                              currentPage === pageNumber ? "page" : undefined
                            }
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNumber
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      }
                    )}

                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === totalPages
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4-4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal - updated with loading state */}
        {isEditModalOpen && editingRecord && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                <h2 className="text-xl font-bold text-gray-800">
                  Edit Origin Charges
                </h2>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingRecord(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Keep existing edit form but with enhanced styling to match the add form */}
              <form onSubmit={handleEditSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="edit-por"
                    >
                      Place of Receipt (POR)
                    </label>
                    <select
                      required
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="edit-por"
                      name="por"
                      value={editingRecord.por}
                      onChange={handleEditFormChange}
                    >
                      <option value="">Select Place of Receipt</option>
                      {porOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="edit-pol"
                    >
                      Port of Loading (POL)
                    </label>
                    <select
                      required
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="edit-pol"
                      name="pol"
                      value={editingRecord.pol}
                      onChange={handleEditFormChange}
                    >
                      <option value="">Select Port of Loading</option>
                      {polOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="edit-container-type"
                    >
                      Container Type
                    </label>
                    <select
                      required
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="edit-container-type"
                      name="container_type"
                      value={editingRecord.container_type}
                      onChange={handleEditFormChange}
                    >
                      <option value="">Select Container Type</option>
                      {containerTypeOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="edit-shipping-lines"
                    >
                      Shipping Line
                    </label>
                    <select
                      required
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="edit-shipping-lines"
                      name="shipping_lines"
                      value={editingRecord.shipping_lines}
                      onChange={handleEditFormChange}
                    >
                      <option value="">Select Shipping Line</option>
                      {shippingLinesOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="edit-bl-fees"
                    >
                      BL Fees
                    </label>
                    <div className="relative flex">
                      <select
                        className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1 "
                        value={
                          typeof editingRecord.bl_fees === "object" &&
                          editingRecord.bl_fees !== null
                            ? editingRecord.bl_fees.currency || "₹"
                            : "₹"
                        }
                        onChange={(e) => {
                          setEditingRecord((prev) => ({
                            ...prev,
                            bl_fees: {
                              value:
                                typeof prev.bl_fees === "object" &&
                                prev.bl_fees !== null
                                  ? prev.bl_fees.value
                                  : parseFloat(prev.bl_fees) || 0,
                              currency: e.target.value,
                            },
                          }));
                        }}
                      >
                        {Object.entries(currencySymbols).map(
                          ([symbol, code]) => (
                            <option key={code} value={symbol}>
                              {symbol}
                            </option>
                          )
                        )}
                      </select>
                      <input
                        required
                        className="shadow appearance-none border rounded w-full py-2 pl-10 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        id="edit-bl-fees"
                        type="number"
                        name="bl_fees"
                        value={
                          typeof editingRecord.bl_fees === "object" &&
                          editingRecord.bl_fees !== null
                            ? editingRecord.bl_fees.value
                            : editingRecord.bl_fees || ""
                        }
                        onChange={(e) => {
                          setEditingRecord((prev) => ({
                            ...prev,
                            bl_fees: {
                              currency:
                                typeof prev.bl_fees === "object" &&
                                prev.bl_fees !== null
                                  ? prev.bl_fees.currency || "₹"
                                  : "₹",
                              value: e.target.value,
                            },
                          }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="edit-thc"
                    >
                      THC
                    </label>
                    <div className="relative flex">
                      <select
                        className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1"
                        value={
                          typeof editingRecord.thc === "object" &&
                          editingRecord.thc !== null
                            ? editingRecord.thc.currency || "₹"
                            : "₹"
                        }
                        onChange={(e) => {
                          setEditingRecord((prev) => ({
                            ...prev,
                            thc: {
                              value:
                                typeof prev.thc === "object" &&
                                prev.thc !== null
                                  ? prev.thc.value
                                  : parseFloat(prev.thc) || 0,
                              currency: e.target.value,
                            },
                          }));
                        }}
                      >
                        {Object.entries(currencySymbols).map(
                          ([symbol, code]) => (
                            <option key={code} value={symbol}>
                              {symbol}
                            </option>
                          )
                        )}
                      </select>
                      <input
                        required
                        className="shadow appearance-none border rounded w-full py-2 pl-10 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        id="edit-thc"
                        type="number"
                        name="thc"
                        value={
                          typeof editingRecord.thc === "object" &&
                          editingRecord.thc !== null
                            ? editingRecord.thc.value
                            : editingRecord.thc || ""
                        }
                        onChange={(e) => {
                          setEditingRecord((prev) => ({
                            ...prev,
                            thc: {
                              currency:
                                typeof prev.thc === "object" &&
                                prev.thc !== null
                                  ? prev.thc.currency || "₹"
                                  : "₹",
                              value: e.target.value,
                            },
                          }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="edit-muc"
                    >
                      MUC
                    </label>
                    <div className="relative flex">
                      <select
                        className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1"
                        value={
                          typeof editingRecord.muc === "object" &&
                          editingRecord.muc !== null
                            ? editingRecord.muc.currency || "₹"
                            : "₹"
                        }
                        onChange={(e) => {
                          setEditingRecord((prev) => ({
                            ...prev,
                            muc: {
                              value:
                                typeof prev.muc === "object" &&
                                prev.muc !== null
                                  ? prev.muc.value
                                  : parseFloat(prev.muc) || 0,
                              currency: e.target.value,
                            },
                          }));
                        }}
                      >
                        {Object.entries(currencySymbols).map(
                          ([symbol, code]) => (
                            <option key={code} value={symbol}>
                              {symbol}
                            </option>
                          )
                        )}
                      </select>
                      <input
                        required
                        className="shadow appearance-none border rounded w-full py-2 pl-10 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        id="edit-muc"
                        type="number"
                        name="muc"
                        value={
                          typeof editingRecord.muc === "object" &&
                          editingRecord.muc !== null
                            ? editingRecord.muc.value
                            : editingRecord.muc || ""
                        }
                        onChange={(e) => {
                          setEditingRecord((prev) => ({
                            ...prev,
                            muc: {
                              currency:
                                typeof prev.muc === "object" &&
                                prev.muc !== null
                                  ? prev.muc.currency || "₹"
                                  : "₹",
                              value: e.target.value,
                            },
                          }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="edit-toll"
                    >
                      TOLL
                    </label>
                    <div className="relative flex">
                      <select
                        className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1"
                        value={
                          typeof editingRecord.toll === "object" &&
                          editingRecord.toll !== null
                            ? editingRecord.toll.currency || "₹"
                            : "₹"
                        }
                        onChange={(e) => {
                          setEditingRecord((prev) => ({
                            ...prev,
                            toll: {
                              value:
                                typeof prev.toll === "object" &&
                                prev.toll !== null
                                  ? prev.toll.value
                                  : parseFloat(prev.toll) || 0,
                              currency: e.target.value,
                            },
                          }));
                        }}
                      >
                        {Object.entries(currencySymbols).map(
                          ([symbol, code]) => (
                            <option key={code} value={symbol}>
                              {symbol}
                            </option>
                          )
                        )}
                      </select>
                      <input
                        required
                        className="shadow appearance-none border rounded w-full py-2 pl-10 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        id="edit-toll"
                        type="number"
                        name="toll"
                        value={
                          typeof editingRecord.toll === "object" &&
                          editingRecord.toll !== null
                            ? editingRecord.toll.value
                            : editingRecord.toll || ""
                        }
                        onChange={(e) => {
                          setEditingRecord((prev) => ({
                            ...prev,
                            toll: {
                              currency:
                                typeof prev.toll === "object" &&
                                prev.toll !== null
                                  ? prev.toll.currency || "₹"
                                  : "₹",
                              value: e.target.value,
                            },
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6 space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingRecord(null);
                    }}
                    disabled={isUpdating}
                    className={`bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors ${
                      isUpdating ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors flex items-center ${
                      isUpdating ? "opacity-75 cursor-not-allowed" : ""
                    }`}
                  >
                    {isUpdating ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Add_origin;
