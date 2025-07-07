import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { usePOROptions } from "../components/POR";
import { usePOLOptions } from "../components/POL";
import { useContainerTypeOptions } from "../components/Container_type";
import { useShippingLinesOptions } from "../components/Shipping_lines";
import { authFetch, handleAuthError, checkAuthentication } from "../utils/authHandler";

const Add_rail_freight = () => {
  // Get options using custom hooks
  const {
    options: porOptions,
    loading: porLoading,
    error: porError,
  } = usePOROptions();
  const {
    options: polOptions,
    loading: polLoading,
    error: polError,
  } = usePOLOptions();
  const {
    options: containerTypeOptions,
    loading: containerTypeLoading,
    error: containerTypeError,
  } = useContainerTypeOptions();
  const {
    options: shippingLinesOptions,
    loading: shippingLinesLoading,
    error: shippingLinesError,
  } = useShippingLinesOptions();

  // Currency symbols mapping
  const currencySymbols = {
    "₹": "INR",
    $: "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
  };

  // Initialize form data with properly named fields and structure
  const [formData, setFormData] = useState({
    name: "",
    por: "",
    pol: "",
    container_type: "",
    shipping_lines: "",
    weight20ft0_10: { value: "", currency: "₹" },
    weight20ft10_20: { value: "", currency: "₹" },
    weight20ft20_26: { value: "", currency: "₹" }, // Fixed field name from weight20ft20Plus to weight20ft20_26
    weight20ft26Plus: { value: "", currency: "₹" }, // Added missing field
    weight40ft10_20: { value: "", currency: "₹" },
    weight40ft20Plus: { value: "", currency: "₹" },
    currency: "₹",
  });

  // State for storing fetched data
  const [railFreightData, setRailFreightData] = useState([]);

  // State for error messages
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
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // Add refreshing state
  // Add state for shipping line filter
  const [shippingLineFilter, setShippingLineFilter] = useState("");

  // Function to extract username from data - add this function
  const getUserName = (item) => {
    // Try multiple possible locations for the username in API response
    if (item.name) return item.name;
    if (item.userName) return item.userName;
    if (item.createdBy) {
      // Check if createdBy is an object or string
      if (typeof item.createdBy === "object" && item.createdBy !== null) {
        return (
          item.createdBy.name ||
          item.createdBy.username ||
          item.createdBy.email ||
          "User"
        );
      }
      return item.createdBy;
    }

    // Check if name is in user object
    if (item.user) {
      if (typeof item.user === "object") {
        if (item.user.name) return item.user.name;
        if (item.user.username) return item.user.username;
        if (item.user.email) return item.user.email;
        return "User";
      }
      return item.user;
    }

    // If all else fails, try to get name from localStorage
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo")) || {};
      const username =
        userInfo.name ||
        userInfo.username ||
        localStorage.getItem("username");
      return username || "Unknown User";
    } catch (e) {
      return "Unknown";
    }
  };

  // Determine which weight fields to show based on container type
  const showWeightFields = () => {
    if (formData.container_type.includes("20")) {
      return "20ft";
    } else if (formData.container_type.includes("40")) {
      return "40ft";
    }
    return null;
  };

  // Format currency for display
  const formatCurrency = (cost) => {
    if (!cost) return "₹ 0";

    if (typeof cost === "object" && cost !== null) {
      const value = parseFloat(cost.value) || 0;
      const currency = cost.currency || "₹";
      return `${currency} ${value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;
    }

    const value = parseFloat(cost) || 0;
    return `₹ ${value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("weight")) {
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

  // Update the currency change handler to sync the common currency field
  const handleCurrencyChange = (field, currency) => {
    setFormData((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        currency,
      },
      currency: currency,
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

  // Add this helper function near the top of the component
  const redirectToLogin = (reason) => {
    console.log(`Redirecting to login: ${reason || 'Authentication required'}`);
    
    // Clear any auth tokens
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('userInfo');
    
    // Redirect to login page
    window.location.href = '/';
  };

  // Update the useEffect for auth check
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      redirectToLogin('No authentication token found');
      return;
    }
    
    // Check if token is expired
    try {
      if (token.includes('.')) {
        // This is likely a JWT token
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiry = payload.exp * 1000; // Convert to milliseconds
        
        if (Date.now() >= expiry) {
          redirectToLogin('Authentication token expired');
          return;
        }
      }
    } catch (e) {
      console.warn('Could not verify token expiration:', e);
    }
    
    checkAuthentication();
  }, []);

  // Handle form submission with loading state
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

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

    try {
      // Check token before submission
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const formDataToSend = {
        name: formData.name,
        por: formData.por,
        pol: formData.pol,
        container_type: formData.container_type,
        shipping_lines: formData.shipping_lines,
        currency: formData.currency,
      };

      if (formData.container_type.includes("20")) {
        formDataToSend.weight20ft0_10 =
          parseFloat(formData.weight20ft0_10.value) || 0;
        formDataToSend.weight20ft10_20 =
          parseFloat(formData.weight20ft10_20.value) || 0;
        formDataToSend.weight20ft20_26 =
          parseFloat(formData.weight20ft20_26?.value) || 0;
        formDataToSend.weight20ft26Plus =
          parseFloat(formData.weight20ft26Plus?.value) || 0;
      } else if (formData.container_type.includes("40")) {
        formDataToSend.weight40ft10_20 =
          parseFloat(formData.weight40ft10_20.value) || 0;
        formDataToSend.weight40ft20Plus =
          parseFloat(formData.weight40ft20Plus.value) || 0;
      }

      console.log("Submitting form data (backend compatible):", formDataToSend);

      // Use authFetch instead of regular fetch
      const response = await authFetch(
        "https://originbackend-7uvypf08.b4a.run/api/railfreight/forms/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formDataToSend),
        }
      );

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          `Server error: ${response.status} - ${responseText || "Unknown error"}`
        );
      }

      setFormData({
        name: formData.name,
        por: "",
        pol: "",
        container_type: "",
        shipping_lines: "",
        currency: formData.currency,
        weight20ft0_10: { value: "", currency: formData.currency },
        weight20ft10_20: { value: "", currency: formData.currency },
        weight20ft20_26: { value: "", currency: formData.currency },
        weight20ft26Plus: { value: "", currency: formData.currency },
        weight40ft10_20: { value: "", currency: formData.currency },
        weight40ft20Plus: { value: "", currency: formData.currency },
      });

      fetchRailFreightData();
      setErrorMessage("");

      // Show success message toast instead of alert
      displaySuccessMessage("Rail freight charge added successfully!");
    } catch (error) {
      console.error("Form submission error:", error);
      
      // Check for auth errors and redirect explicitly
      if (error.message.includes('token') || error.message.includes('auth') || 
          error.message.includes('unauthorized') || error.message.includes('forbidden')) {
        redirectToLogin(`Authentication error during form submission: ${error.message}`);
        return;
      }
      
      // Check if it's an auth error before showing generic error
      if (handleAuthError(error)) {
        // handleAuthError should handle redirection
        return;
      }
      
      setErrorMessage(`Form submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }  };

  // Fetch rail freight data with auth error handling
  const fetchRailFreightData = async (clearForm = false) => {
    setIsRefreshing(true); // Start loading state
    try {
      // Check token before fetching
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        redirectToLogin('No authentication token found for data refresh');
        return;
      }
      
      // Use authFetch instead of regular fetch
      const response = await authFetch(
        "https://originbackend-7uvypf08.b4a.run/api/railfreight/forms/user"
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      console.log("Fetched rail freight data:", data);
      setRailFreightData(data);
      setCurrentPage(1); // Reset to first page when new data is fetched
      
      // Clear form fields if requested (when refresh button is clicked)
      if (clearForm) {
        // Get current user name and currency to preserve them
        const currentUserName = formData.name;
        const currentCurrency = formData.currency;
        
        setFormData({
          name: currentUserName, // Keep current user name
          por: "",
          pol: "",
          container_type: "",
          shipping_lines: "",
          weight20ft0_10: { value: "", currency: currentCurrency },
          weight20ft10_20: { value: "", currency: currentCurrency },
          weight20ft20_26: { value: "", currency: currentCurrency },
          weight20ft26Plus: { value: "", currency: currentCurrency },
          weight40ft10_20: { value: "", currency: currentCurrency },
          weight40ft20Plus: { value: "", currency: currentCurrency },
          currency: currentCurrency,
        });
        
        // Clear any error messages
        setErrorMessage("");
        
        displaySuccessMessage("Data refreshed and form cleared successfully!");
      } else {
        displaySuccessMessage("Data refreshed successfully"); // Add success message
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      
      // Check for explicit auth errors
      if (error.message.includes('token') || error.message.includes('auth') || 
          error.message.includes('unauthorized') || error.message.includes('forbidden')) {
        redirectToLogin(`Authentication error during data refresh: ${error.message}`);
        return;
      }
      
      // Let handleAuthError try to handle it
      if (handleAuthError(error)) {
        return; // handleAuthError should handle redirection
      }
      
      setErrorMessage(`Failed to fetch data: ${error.message}`);
    } finally {
      setIsRefreshing(false); // End loading state
    }
  };

  // Handle edit button click
  const handleEditClick = (record) => {
    setEditingRecord({ ...record });
    setIsEditModalOpen(true);
  };

  // Handle copy button click - auto-fill form with selected row data
  const handleCopyClick = (record) => {
    // Map the record data to the form structure
    const copiedData = {
      name: formData.name, // Keep current user name
      por: record.por || "",
      pol: record.pol || "",
      container_type: record.container_type || "",
      shipping_lines: record.shipping_lines || "",
      currency: record.currency || "₹",
      weight20ft0_10: { 
        value: record.weight20ft0_10 ? record.weight20ft0_10.toString() : "", 
        currency: record.currency || "₹" 
      },
      weight20ft10_20: { 
        value: record.weight20ft10_20 ? record.weight20ft10_20.toString() : "", 
        currency: record.currency || "₹" 
      },
      weight20ft20_26: { 
        value: record.weight20ft20_26 ? record.weight20ft20_26.toString() : "", 
        currency: record.currency || "₹" 
      },
      weight20ft26Plus: { 
        value: record.weight20ft26Plus ? record.weight20ft26Plus.toString() : "", 
        currency: record.currency || "₹" 
      },
      weight40ft10_20: { 
        value: record.weight40ft10_20 ? record.weight40ft10_20.toString() : "", 
        currency: record.currency || "₹" 
      },
      weight40ft20Plus: { 
        value: record.weight40ft20Plus ? record.weight40ft20Plus.toString() : "", 
        currency: record.currency || "₹" 
      },
    };

    setFormData(copiedData);
    
    // Show success message to indicate data has been copied
    displaySuccessMessage("Data copied to form successfully! You can now modify and submit.");
    
    // Scroll to top of the page to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Handle edit form change
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditingRecord((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle edit form currency change
  const handleEditCurrencyChange = (newCurrency) => {
    setEditingRecord((prev) => ({
      ...prev,
      currency: newCurrency,
    }));
  };

  // Handle edit form submission with loading state
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsUpdating(true); // Start loading animation

    const recordId = editingRecord._id || editingRecord.id;
    if (!recordId) {
      setErrorMessage("Cannot update record: Missing ID");
      setIsUpdating(false);
      return;
    }

    try {
      const updatedRecord = {
        name: editingRecord.name,
        por: editingRecord.por,
        pol: editingRecord.pol,
        container_type: editingRecord.container_type,
        shipping_lines: editingRecord.shipping_lines,
        currency: editingRecord.currency,
      };

      if (editingRecord.container_type.includes("20")) {
        updatedRecord.weight20ft0_10 =
          parseFloat(editingRecord.weight20ft0_10) || 0;
        updatedRecord.weight20ft10_20 =
          parseFloat(editingRecord.weight20ft10_20) || 0;
        updatedRecord.weight20ft20_26 =
          parseFloat(editingRecord.weight20ft20_26) || 0;
        updatedRecord.weight20ft26Plus =
          parseFloat(editingRecord.weight20ft26Plus) || 0;
      } else if (editingRecord.container_type.includes("40")) {
        updatedRecord.weight40ft10_20 =
          parseFloat(editingRecord.weight40ft10_20) || 0;
        updatedRecord.weight40ft20Plus =
          parseFloat(editingRecord.weight40ft20Plus) || 0;
      }

      console.log("Sending updated record:", updatedRecord);

      // Use authFetch instead of regular fetch
      const response = await authFetch(
        `https://originbackend-7uvypf08.b4a.run/api/railfreight/forms/${recordId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedRecord),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Server error: ${response.status} - ${errorText || "Unknown error"}`
        );
      }      setIsEditModalOpen(false);
      setEditingRecord(null);
      fetchRailFreightData(false); // Don't clear form when updating

      // Show success message toast instead of alert
      displaySuccessMessage("Rail freight charge updated successfully!");
    } catch (error) {
      console.error("Error updating record:", error);
      
      // Check for auth errors and redirect explicitly
      if (error.message.includes('token') || error.message.includes('auth') || 
          error.message.includes('unauthorized') || error.message.includes('forbidden')) {
        redirectToLogin(`Authentication error during record update: ${error.message}`);
        return;
      }
      
      // Check if it's an auth error before showing generic error message
      if (!handleAuthError(error)) {
        setErrorMessage(`Failed to update record: ${error.message}`);
      }
    } finally {
      setIsUpdating(false); // End loading animation
    }
  };
  useEffect(() => {
    fetchRailFreightData(false); // Don't clear form on initial load

    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo")) || {};
      const username =
        userInfo.name ||
        userInfo.username ||
        localStorage.getItem("username") ||
        "";

      setFormData((prev) => ({
        ...prev,
        name: username,
      }));
    } catch (error) {
      console.error("Error parsing user info from localStorage:", error);
    }
  }, []);

  // Extract unique shipping lines for filter dropdown
  const uniqueShippingLines = React.useMemo(() => {
    const shippingLines = railFreightData
      .map((item) => item.shipping_lines)
      .filter(Boolean); // Filter out null/undefined values
    return ["", ...new Set(shippingLines)].sort(); // Add empty option and sort alphabetically
  }, [railFreightData]);

  // Sort data
  const sortedData = [...railFreightData].sort((a, b) => {
    // Sort by createdAt date in descending order (newest first)
    return (
      new Date(b.createdAt || b.updatedAt || 0) -
      new Date(a.createdAt || a.updatedAt || 0)
    );
  });

  // Apply shipping line filter to the data
  const filteredData = shippingLineFilter
    ? sortedData.filter(item => item.shipping_lines === shippingLineFilter)
    : sortedData;

  // Get current entries for pagination
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredData.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(filteredData.length / entriesPerPage);

  // Handle shipping line filter changes
  const handleShippingLineFilterChange = (e) => {
    setShippingLineFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Function to change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">          <h1 className="text-xl font-bold text-gray-800">
            Add Rail Freight Charges
          </h1>
          <button
            onClick={() => fetchRailFreightData(true)}
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

        <div className="bg-white shadow-sm rounded-md overflow-hidden mb-4 border border-gray-200">
          <div className="bg-blue-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                Please enter new charge details and ensure timely updates.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-red-600 mb-2 pb-1 border-b border-gray-200">
                Shipment Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
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
                <div>
                  <label
                    className="block text-black text-xs font-medium mb-1"
                    htmlFor="currency"
                  >
                    Common Currency
                  </label>
                  <select
                    className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 px-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={(e) => {
                      const newCurrency = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        currency: newCurrency,
                        weight20ft0_10: {
                          ...prev.weight20ft0_10,
                          currency: newCurrency,
                        },
                        weight20ft10_20: {
                          ...prev.weight20ft10_20,
                          currency: newCurrency,
                        },
                        weight20ft20_26: {
                          ...prev.weight20ft20_26,
                          currency: newCurrency,
                        },
                        weight20ft26Plus: {
                          ...prev.weight20ft26Plus,
                          currency: newCurrency,
                        },
                        weight40ft10_20: {
                          ...prev.weight40ft10_20,
                          currency: newCurrency,
                        },
                        weight40ft20Plus: {
                          ...prev.weight40ft20Plus,
                          currency: newCurrency,
                        },
                      }));
                    }}
                  >
                    {Object.entries(currencySymbols).map(([symbol, code]) => (
                      <option key={code} value={symbol}>
                        {symbol} ({code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {showWeightFields() && (
              <div className="mb-3">
                <h3 className="text-sm font-medium text-red-600 mb-2 pb-1 border-b border-gray-200">
                  Weight-based Charges - {showWeightFields()}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {showWeightFields() === "20ft" && (
                    <>
                      <div>
                        <label
                          className="block text-black text-xs font-medium mb-1"
                          htmlFor="weight20ft0_10"
                        >
                          20ft (0-10 Ton) /Container
                        </label>
                        <div className="relative flex">
                          <div className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1 flex items-center justify-center">
                            {formData.currency}
                          </div>
                          <input
                            required
                            className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 pl-10 pr-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            id="weight20ft0_10"
                            type="number"
                            name="weight20ft0_10"
                            value={formData.weight20ft0_10.value}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          className="block text-black text-xs font-medium mb-1"
                          htmlFor="weight20ft10_20"
                        >
                          20ft (10-20 Ton) /Container
                        </label>
                        <div className="relative flex">
                          <div className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1 flex items-center justify-center">
                            {formData.currency}
                          </div>
                          <input
                            required
                            className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 pl-10 pr-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            id="weight20ft10_20"
                            type="number"
                            name="weight20ft10_20"
                            value={formData.weight20ft10_20.value}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          className="block text-black text-xs font-medium mb-1"
                          htmlFor="weight20ft20_26"
                        >
                          20ft (20-26 Ton) /Container
                        </label>
                        <div className="relative flex">
                          <div className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1 flex items-center justify-center">
                            {formData.currency}
                          </div>
                          <input
                            required
                            className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 pl-10 pr-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            id="weight20ft20_26"
                            type="number"
                            name="weight20ft20_26"
                            value={formData.weight20ft20_26.value}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          className="block text-black text-xs font-medium mb-1"
                          htmlFor="weight20ft26Plus"
                        >
                          20ft (26+ Ton) /Container
                        </label>
                        <div className="relative flex">
                          <div className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1 flex items-center justify-center">
                            {formData.currency}
                          </div>
                          <input
                            required
                            className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 pl-10 pr-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            id="weight20ft26Plus"
                            type="number"
                            name="weight20ft26Plus"
                            value={formData.weight20ft26Plus.value}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {showWeightFields() === "40ft" && (
                    <>
                      <div>
                        <label
                          className="block text-black text-xs font-medium mb-1"
                          htmlFor="weight40ft10_20"
                        >
                          40ft (10-20 Ton) /Container
                        </label>
                        <div className="relative flex">
                          <div className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1 flex items-center justify-center">
                            {formData.currency}
                          </div>
                          <input
                            required
                            className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 pl-10 pr-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            id="weight40ft10_20"
                            type="number"
                            name="weight40ft10_20"
                            value={formData.weight40ft10_20.value}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          className="block text-black text-xs font-medium mb-1"
                          htmlFor="weight40ft20Plus"
                        >
                          40ft (20+ Ton) /Container
                        </label>
                        <div className="relative flex">
                          <div className="absolute left-0 top-0 w-9 h-full bg-gray-100 border-r-0 border-gray-300 rounded-l-md text-xs px-1 flex items-center justify-center">
                            {formData.currency}
                          </div>
                          <input
                            required
                            className="shadow-sm border border-gray-300 rounded-md w-full py-1.5 pl-10 pr-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            id="weight40ft20Plus"
                            type="number"
                            name="weight40ft20Plus"
                            value={formData.weight40ft20Plus.value}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

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
                    Add Rail Freight
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <div className="bg-blue-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Rail Freight Charges
            </h2>
            <div className="flex items-center">
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mr-2">
                {railFreightData.length} Records
              </span>
              <span className="text-gray-500 text-xs">
                Showing {currentEntries.length > 0 ? indexOfFirstEntry + 1 : 0}{" "}
                to {Math.min(indexOfLastEntry, filteredData.length)} of{" "}
                {filteredData.length}
                {shippingLineFilter && (
                  <span>
                    {" "}
                    (filtered from {railFreightData.length})
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Add shipping line filter */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="shipping-line-filter"
                  className="text-sm font-medium text-gray-700 whitespace-nowrap"
                >
                  Filter by Shipping Line:
                </label>
                <select
                  id="shipping-line-filter"
                  className="shadow-sm border border-gray-300 rounded-md py-1.5 px-2 text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  value={shippingLineFilter}
                  onChange={handleShippingLineFilterChange}
                >
                  <option value="">All Lines</option>
                  {uniqueShippingLines
                    .filter((line) => line !== "")
                    .map((line) => (
                      <option key={line} value={line}>
                        {line}
                      </option>
                    ))}
                </select>
              </div>

              {shippingLineFilter && (
                <button
                  onClick={() => {
                    setShippingLineFilter("");
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg
                    className="h-3 w-3 mr-1"
                    xmlns="http://www.w3.org/2000/svg"
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
                  Clear Filter
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-3 text-left border-r border-gray-200">
                    User
                  </th>
                  <th className="py-3 px-3 text-left border-r border-gray-200">
                    POR
                  </th>
                  <th className="py-3 px-3 text-left border-r border-gray-200">
                    POL
                  </th>
                  <th className="py-3 px-3 text-left border-r border-gray-200">
                    Container Type
                  </th>
                  <th className="py-3 px-3 text-left border-r border-gray-200">
                    Shipping Line
                  </th>
                  <th className="py-3 px-3 text-right border-r border-gray-200">
                    20ft (0-10 Ton)
                  </th>
                  <th className="py-3 px-3 text-right border-r border-gray-200">
                    20ft (10-20 Ton)
                  </th>
                  <th className="py-3 px-3 text-right border-r border-gray-200">
                    20ft (20-26 Ton)
                  </th>
                  <th className="py-3 px-3 text-right border-r border-gray-200">
                    20ft (26+ Ton)
                  </th>
                  <th className="py-3 px-3 text-right border-r border-gray-200">
                    40ft (10-20 Ton)
                  </th>
                  <th className="py-3 px-3 text-right border-r border-gray-200">
                    40ft (20+ Ton)
                  </th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentEntries.length > 0 ? (
                  currentEntries.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-4 px-3 text-sm text-red-600 font-medium border-r border-gray-200">
                        {getUserName(row)}
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-900 border-r border-gray-200">
                        {row.por}
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-900 border-r border-gray-200">
                        {row.pol}
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-900 border-r border-gray-200">
                        {row.container_type}
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-900 border-r border-gray-200">
                        {row.shipping_lines}
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                        {row.weight20ft0_10
                          ? `${row.currency} ${row.weight20ft0_10}`
                          : "-"}
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                        {row.weight20ft10_20
                          ? `${row.currency} ${row.weight20ft10_20}`
                          : "-"}
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                        {row.weight20ft20_26
                          ? `${row.currency} ${row.weight20ft20_26}`
                          : "-"}
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                        {row.weight20ft26Plus
                          ? `${row.currency} ${row.weight20ft26Plus}`
                          : "-"}
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                        {row.weight40ft10_20
                          ? `${row.currency} ${row.weight40ft10_20}`
                          : "-"}
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-900 text-right font-medium border-r border-gray-200">
                        {row.weight40ft20Plus
                          ? `${row.currency} ${row.weight40ft20Plus}`
                          : "-"}
                      </td>
                      <td className="py-4 px-4 text-center flex space-x-2">
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
                        </button>                        <button
                          onClick={() => handleCopyClick(row)}
                          className="ml-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium py-1 px-3 rounded-md text-xs transition-colors inline-flex items-center"
                          title="Copy data to form"
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
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          Copy
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={12}
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
                        <p>No rail freight data available</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Add your first rail freight charge using the form
                          above
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Update pagination controls to use filteredData.length */}
          {filteredData.length > entriesPerPage && (
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
                      {Math.min(indexOfLastEntry, filteredData.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">{filteredData.length}</span>{" "}
                    results
                    {shippingLineFilter && (
                      <span>
                        {" "}
                        (filtered from {railFreightData.length})
                      </span>
                    )}
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
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
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

        {isEditModalOpen && editingRecord && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                <h2 className="text-xl font-bold text-gray-800">
                  Edit Rail Freight Charges
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
                      htmlFor="edit-currency"
                    >
                      Currency
                    </label>
                    <select
                      required
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="edit-currency"
                      name="currency"
                      value={editingRecord.currency || "₹"}
                      onChange={(e) => handleEditCurrencyChange(e.target.value)}
                    >
                      {Object.entries(currencySymbols).map(([symbol, code]) => (
                        <option key={code} value={symbol}>
                          {symbol} ({code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Weight-based Charges
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {editingRecord.container_type.includes("20") ? (
                      <>
                        <div className="mb-3">
                          <label
                            className="block text-gray-700 text-sm font-bold mb-2"
                            htmlFor="edit-weight20ft0_10"
                          >
                            20ft (0-10 Ton)
                          </label>
                          <input
                            type="number"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="edit-weight20ft0_10"
                            name="weight20ft0_10"
                            value={editingRecord.weight20ft0_10 || 0}
                            onChange={handleEditFormChange}
                          />
                        </div>
                        <div className="mb-3">
                          <label
                            className="block text-gray-700 text-sm font-bold mb-2"
                            htmlFor="edit-weight20ft10_20"
                          >
                            20ft (10-20 Ton)
                          </label>
                          <input
                            type="number"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="edit-weight20ft10_20"
                            name="weight20ft10_20"
                            value={editingRecord.weight20ft10_20 || 0}
                            onChange={handleEditFormChange}
                          />
                        </div>
                        <div className="mb-3">
                          <label
                            className="block text-gray-700 text-sm font-bold mb-2"
                            htmlFor="edit-weight20ft20_26"
                          >
                            20ft (20-26 Ton)
                          </label>
                          <input
                            type="number"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="edit-weight20ft20_26"
                            name="weight20ft20_26"
                            value={editingRecord.weight20ft20_26 || 0}
                            onChange={handleEditFormChange}
                          />
                        </div>
                        <div className="mb-3">
                          <label
                            className="block text-gray-700 text-sm font-bold mb-2"
                            htmlFor="edit-weight20ft26Plus"
                          >
                            20ft (26+ Ton)
                          </label>
                          <input
                            type="number"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="edit-weight20ft26Plus"
                            name="weight20ft26Plus"
                            value={editingRecord.weight20ft26Plus || 0}
                            onChange={handleEditFormChange}
                          />
                        </div>
                      </>
                    ) : editingRecord.container_type.includes("40") ? (
                      <>
                        <div className="mb-3">
                          <label
                            className="block text-gray-700 text-sm font-bold mb-2"
                            htmlFor="edit-weight40ft10_20"
                          >
                            40ft (10-20 Ton)
                          </label>
                          <input
                            type="number"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="edit-weight40ft10_20"
                            name="weight40ft10_20"
                            value={editingRecord.weight40ft10_20 || 0}
                            onChange={handleEditFormChange}
                          />
                        </div>
                        <div className="mb-3">
                          <label
                            className="block text-gray-700 text-sm font-bold mb-2"
                            htmlFor="edit-weight40ft20Plus"
                          >
                            40ft (20+ Ton)
                          </label>
                          <input
                            type="number"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="edit-weight40ft20Plus"
                            name="weight40ft20Plus"
                            value={editingRecord.weight40ft20Plus || 0}
                            onChange={handleEditFormChange}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 italic col-span-3">
                        Please select a container type to view weight-based
                        charges.
                      </p>
                    )}
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

export default Add_rail_freight;
