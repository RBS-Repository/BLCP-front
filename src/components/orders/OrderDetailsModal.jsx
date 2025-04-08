import PropTypes from 'prop-types';
import { FaUser, FaMapMarkerAlt, FaPhone, FaEnvelope, FaCreditCard, FaFilePdf } from 'react-icons/fa';
import { useEffect } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import BLCPLogo from '../../assets/BLCP (Blue).png';

const paymentMethodMap = {
  gcash: 'GCash',
  grab_pay: 'GrabPay',
  maya: 'Maya Pay',
  card: 'Credit/Debit Card',
};

const OrderDetailsModal = ({ order, onUpdate }) => {
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateSummary = () => {
    if (order?.summary) {
      return {
        subtotal: order.summary.subtotal || 0,
        tax: order.summary.tax || 0,
        shipping: order.summary.shipping || 0,
        discount: order.summary.discount || 0,
        reward: order.summary.reward || 0,
        total: order.summary.total || 0
      };
    }
    
    // Calculate from items if summary doesn't exist
    const calculatedSubtotal = (order?.items || []).reduce((sum, item) => {
      const price = item?.price || item?.product?.price || 0;
      const quantity = item?.quantity || 0;
      return sum + (price * quantity);
    }, 0);

    const calculatedTax = calculatedSubtotal * 0.12;
    const calculatedShipping = order?.shipping?.cost || 0;
    const calculatedDiscount = order?.discount || 0;
    const calculatedReward = order?.reward?.amount || 0;
    const calculatedTotal = calculatedSubtotal + calculatedTax + calculatedShipping - calculatedDiscount - calculatedReward;

    return {
      subtotal: order?.subtotal || calculatedSubtotal,
      tax: order?.tax || calculatedTax,
      shipping: calculatedShipping,
      discount: calculatedDiscount,
      reward: calculatedReward,
      total: order?.total || calculatedTotal
    };
  };

  const { subtotal, tax, shipping, discount, reward, total } = calculateSummary();

  console.log(order); // Log the order data

  useEffect(() => {
    if (order?._id) {
      const eventHandler = () => {
        // Refresh order data when parent updates
        if (typeof onUpdate === 'function') {
          onUpdate();
        }
      };
      
      window.addEventListener('orders-updated', eventHandler);
      return () => window.removeEventListener('orders-updated', eventHandler);
    }
  }, [order?._id, onUpdate]);

  // Function to generate PDF for this specific order
  const generateOrderPDF = async () => {
    // Show loading indicator
    Swal.fire({
      title: 'Generating PDF',
      html: 'Please wait while we prepare your order details...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // Create PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = 20; // Initial y position
      
      // Define BLCP brand colors
      const blcpBlue = [54, 58, 148]; // RGB for #363a94
      const blcpLightBlue = [222, 226, 255]; // Light blue for backgrounds

      // Add a subtle header background
      doc.setFillColor(242, 242, 255);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Add BLCP logo from assets
      try {
        // Use the imported logo
        doc.addImage(BLCPLogo, 'PNG', margin, 10, 40, 20);
      } catch (error) {
        // If adding the logo fails, use text fallback
        console.error("Error adding logo to PDF:", error);
        doc.setFontSize(18);
        doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
        doc.setFont(undefined, 'bold');
        doc.text("BLCP", margin, 25);
      }

      // Add Order Details header
      doc.setFontSize(18);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.setFont(undefined, 'bold');
      doc.text('ORDER DETAILS', pageWidth / 2, 25, { align: 'center' });
      
      // Add divider line
      doc.setDrawColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, 35, pageWidth - margin, 35);
      
      y = 50; // Start content after header

      // Add order ID and date with improved styling
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'normal');
      
      // Create info box
      doc.setFillColor(248, 249, 252);
      doc.roundedRect(margin, y, pageWidth - (margin * 2), 25, 3, 3, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(70, 70, 70);
      doc.text(`Order #: ${order._id}`, margin + 5, y + 10);
      doc.text(`Date: ${formatDateTime(order.createdAt)}`, margin + 5, y + 20);
      
      // Add status badges with improved styling
      y += 35;
      
      // Status badge with BLCP blue
      doc.setFillColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.roundedRect(margin, y, 70, 10, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(`STATUS: ${order.status.toUpperCase()}`, margin + 35, y + 6, { align: 'center' });
      
      // Payment status badge
      if (order?.payment?.status) {
        let paymentColor;
        if (order.payment.status === 'paid') {
          paymentColor = [39, 174, 96]; // Green
        } else if (order.payment.status === 'failed') {
          paymentColor = [231, 76, 60]; // Red
        } else {
          paymentColor = [243, 156, 18]; // Yellow/Orange
        }
        
        doc.setFillColor(paymentColor[0], paymentColor[1], paymentColor[2]);
        doc.roundedRect(pageWidth - margin - 80, y, 80, 10, 3, 3, 'F');
        doc.text(`PAYMENT: ${order.payment.status.toUpperCase()}`, pageWidth - margin - 40, y + 6, { align: 'center' });
      }
      
      y += 20;

      // Add customer information with improved styling
      doc.setFontSize(14);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.setFont(undefined, 'bold');
      doc.text('Customer Information', margin, y);
      
      // Add underline for section headers
      doc.setDrawColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.setLineWidth(0.2);
      const textWidth = doc.getTextWidth('Customer Information');
      doc.line(margin, y + 1, margin + textWidth, y + 1);
      
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [],
        body: [
          ['Name', `${order.shipping?.firstName || ''} ${order.shipping?.lastName || ''}`],
          ['Address', order.shipping?.address || 'N/A'],
          ['City/Province', `${order.shipping?.city || 'N/A'}, ${order.shipping?.province || 'N/A'}`],
          ['Contact', order.shipping?.phone || 'N/A'],
          ['Email', order.shipping?.email || 'N/A'],
          ['Payment Method', order.payment?.method ? paymentMethodMap[order.payment.method] || order.payment.method : 'Not specified']
        ],
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 4
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 30, textColor: [80, 80, 80] },
          1: { cellWidth: 'auto', textColor: [60, 60, 60] }
        },
        alternateRowStyles: {
          fillColor: [248, 249, 252]
        }
      });

      y = doc.lastAutoTable.finalY + 15;

      // Add order items
      doc.setFontSize(14);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.setFont(undefined, 'bold');
      doc.text('Order Items', margin, y);
      
      // Add underline for section headers
      const itemsTextWidth = doc.getTextWidth('Order Items');
      doc.line(margin, y + 1, margin + itemsTextWidth, y + 1);
      
      y += 10;

      // Prepare table data with P currency symbol
      const itemsData = order.items.map(item => [
        item.name,
        `P${parseFloat(item.price).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`,
        item.quantity,
        `P${parseFloat(item.subtotal || (item.price * item.quantity)).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Product', 'Price', 'Qty', 'Subtotal']],
        body: itemsData,
        theme: 'grid',
        headStyles: {
          fillColor: blcpBlue,
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 25, halign: 'right' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' }
        },
        alternateRowStyles: {
          fillColor: [248, 249, 252]
        },
        margin: { bottom: 40 },
        pageBreak: 'auto',
        bodyStyles: { minCellHeight: 10 }
      });

      y = doc.lastAutoTable.finalY + 15;

      // Add order summary with improved styling
      doc.setFontSize(14);
      doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
      doc.setFont(undefined, 'bold');
      doc.text('Order Summary', margin, y);
      
      // Add underline for section headers
      const summaryTextWidth = doc.getTextWidth('Order Summary');
      doc.line(margin, y + 1, margin + summaryTextWidth, y + 1);
      
      y += 10;

      // Check if there's enough space for summary table (at least 100pts)
      // If not, add a new page before continuing
      if (y > pageHeight - 130) {
        doc.addPage();
        y = 30; // Reset y position to top of new page with some margin
        
        // Add section header again on new page
        doc.setFontSize(14);
        doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
        doc.setFont(undefined, 'bold');
        doc.text('Order Summary (continued)', margin, y);
        doc.line(margin, y + 1, margin + doc.getTextWidth('Order Summary (continued)'), y + 1);
        y += 10;
      }

      // Create a summary table with styled background
      doc.setFillColor(248, 249, 252);
      doc.roundedRect(margin, y, pageWidth - (margin * 2), 80, 3, 3, 'F');

      autoTable(doc, {
        startY: y + 5,
        head: [],
        body: [
          ['Subtotal', `P${parseFloat(subtotal).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`],
          ['Tax (12%)', `P${parseFloat(tax).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`],
          ['Shipping', `P${parseFloat(shipping).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`],
          ...(discount > 0 ? [['Discount', `-P${parseFloat(discount).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`]] : []),
          ...(reward > 0 ? [['Reward Applied', `-P${parseFloat(reward).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`]] : []),
          ['Total', `P${parseFloat(total).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`]
        ],
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 4,
          lineColor: [240, 240, 240]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40, textColor: [80, 80, 80] },
          1: { cellWidth: 30, halign: 'right', textColor: [60, 60, 60] }
        },
        didDrawCell: function (data) {
          // Add special styling for the Total row
          if (data.row.index === data.table.body.length - 1) {
            doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
          }
        },
        margin: { bottom: 40 },
        pageBreak: 'auto'
      });

      // Add shipping details to PDF if available
      if (order.shipping) {
        y = doc.lastAutoTable.finalY + 15;
        
        // Check if enough space for shipping section
        if (y > pageHeight - 100) {
          doc.addPage();
          y = 30;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
        doc.setFont(undefined, 'bold');
        doc.text('Shipping Details', margin, y);
        
        // Add underline for section headers
        const shippingTextWidth = doc.getTextWidth('Shipping Details');
        doc.line(margin, y + 1, margin + shippingTextWidth, y + 1);
        
        y += 10;
        
        const shippingDetails = [
          ['Shipping Method', order.shipping.method || 'Standard Shipping'],
          ['Shipping Cost', `P${parseFloat(shipping).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`]
        ];
        
        if (order.shipping.trackingNumber) {
          shippingDetails.push(['Tracking Number', order.shipping.trackingNumber]);
        }
        
        if (order.shipping.estimatedDelivery) {
          const deliveryDate = new Date(order.shipping.estimatedDelivery);
          shippingDetails.push(['Estimated Delivery', format(deliveryDate, 'MMMM d, yyyy')]);
        }
        
        autoTable(doc, {
          startY: y,
          head: [],
          body: shippingDetails,
          theme: 'plain',
          styles: {
            fontSize: 10,
            cellPadding: 4
          },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40, textColor: [80, 80, 80] },
            1: { cellWidth: 'auto', textColor: [60, 60, 60] }
          },
          alternateRowStyles: {
            fillColor: [248, 249, 252]
          },
          margin: { bottom: 40 },
          pageBreak: 'auto'
        });
      }
      
      // Add reward details to PDF if a reward was applied
      if (reward > 0 && order.reward) {
        y = doc.lastAutoTable.finalY + 15;
        
        // Check if enough space for reward section
        if (y > pageHeight - 100) {
          doc.addPage();
          y = 30;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
        doc.setFont(undefined, 'bold');
        doc.text('Reward Applied', margin, y);
        
        // Add underline for section headers
        const rewardTextWidth = doc.getTextWidth('Reward Applied');
        doc.line(margin, y + 1, margin + rewardTextWidth, y + 1);
        
        y += 10;
        
        // Add background for reward section
        doc.setFillColor(250, 255, 245); // Light green background
        doc.roundedRect(margin, y, pageWidth - (margin * 2), 40, 3, 3, 'F');
        
        const rewardDetails = [
          ['Reward Name', order.reward.name || 'Discount Reward'],
          ['Amount', `P${parseFloat(reward).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`]
        ];
        
        if (order.reward.code) {
          rewardDetails.push(['Reward Code', order.reward.code]);
        }
        
        if (order.reward.description) {
          rewardDetails.push(['Description', order.reward.description]);
        }
        
        autoTable(doc, {
          startY: y + 5,
          head: [],
          body: rewardDetails,
          theme: 'plain',
          styles: {
            fontSize: 10,
            cellPadding: 4
          },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40, textColor: [80, 80, 80] },
            1: { cellWidth: 'auto', textColor: [60, 60, 60] }
          },
          margin: { bottom: 40 },
          pageBreak: 'auto'
        });
      }

      // Add a function to ensure there's no content in the footer area
      const ensureFooterSpace = () => {
        const currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY : y;
        
        // If content is too close to footer area, add a new page
        if (currentY > pageHeight - 30) {
          doc.addPage();
          return 30; // Return new Y position at top of new page
        }
        return currentY;
      };
      
      // Ensure footer has enough space
      y = ensureFooterSpace();

      // Add custom footer with BLCP branding
      const totalPages = doc.internal.getNumberOfPages();
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Add footer background
        doc.setFillColor(242, 242, 255);
        doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
        
        // Add blue line divider
        doc.setDrawColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
        doc.setLineWidth(0.5);
        doc.line(0, pageHeight - 25, pageWidth, pageHeight - 25);
        
        // Add company info
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text('Beauty Lab Cosmetic Products Corporation', margin, pageHeight - 15);
        doc.text('Contact: blcpcorpph@gmail.com | www.blcpcorp.com', margin, pageHeight - 10);
        
        // Add page numbers
        doc.setFontSize(8);
        doc.setTextColor(blcpBlue[0], blcpBlue[1], blcpBlue[2]);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
        doc.text(`Order #${order._id}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      // Save the PDF
      doc.save(`BLCP_Order_${order._id}.pdf`);

      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'PDF Generated!',
        text: 'Your order details have been exported to PDF.',
        confirmButtonColor: '#363a94'
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to generate PDF. Please try again.',
        confirmButtonColor: '#363a94'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Order Header with Export Button */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h3 className="text-2xl font-semibold text-gray-800">
            Order #{order?._id || 'N/A'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Placed on: {formatDateTime(order?.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`px-4 py-2 text-base font-medium rounded-full ${
              order?.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : order?.status === 'processing'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {order?.status?.toUpperCase() || 'PENDING'}
          </span>
          {order?.payment?.status && (
            <span
              className={`px-4 py-2 text-base font-medium rounded-full ${
                order?.payment?.status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : order?.payment?.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : order?.payment?.status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              PAYMENT {order?.payment?.status?.toUpperCase()}
            </span>
          )}
          
          {/* Export to PDF button */}
          <button
            onClick={generateOrderPDF}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
          >
            <FaFilePdf className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Order Content */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Order Items Section */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-gray-700">Order Items</h4>
          <div className="space-y-4">
            {(order?.items || []).map((item, index) => {
              const productInfo = item.product || {};
              const price = item.price || productInfo.price || 0;
              const quantity = item.quantity || 0;
              const subtotal = price * quantity;
              
              return (
                <div key={item?._id || index} className="flex items-start p-4 bg-gray-50 rounded-lg">
                  <img
                    src={productInfo.image || item.image || '/images/default-product.png'}
                    alt={productInfo.name || item.name || 'Product'}
                    className="w-20 h-20 rounded-md object-cover"
                    onError={(e) => {
                      e.target.src = '/images/default-product.png';
                    }}
                  />
                  <div className="ml-4 flex-1">
                    <h5 className="font-medium text-gray-800">
                      {productInfo.name || item.name || 'Unnamed Product'}
                    </h5>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Quantity: {quantity}</p>
                      <p>Price: P{price.toLocaleString()}</p>
                      <p className="font-semibold">
                        Subtotal: P{subtotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary Section */}
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gray-700">Order Summary</h4>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">P{parseFloat(subtotal).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (12%):</span>
                  <span className="font-medium">P{parseFloat(tax).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">P{parseFloat(shipping).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-green-600">-P{parseFloat(discount).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</span>
                  </div>
                )}
                {reward > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Reward Applied:</span>
                    <span className="font-medium text-green-600">-P{parseFloat(reward).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold text-lg">Total:</span>
                  <span className="font-bold text-2xl text-green-600">
                    P{parseFloat(total).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gray-700">Customer Information</h4>
            <div className="bg-white p-4 rounded-lg shadow-sm border space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 flex items-center gap-2 text-gray-600">
                  <FaUser className="h-4 w-4" />
                  <span>Name:</span>
                </div>
                <div className="col-span-2 text-gray-800">
                  {order?.shipping?.firstName || ''} {order?.shipping?.lastName || ''}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 flex items-center gap-2 text-gray-600">
                  <FaMapMarkerAlt className="h-4 w-4" />
                  <span>Address:</span>
                </div>
                <div className="col-span-2 text-gray-800">
                  {order?.shipping?.address || 'No address provided'}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 flex items-center gap-2 text-gray-600">
                  <FaMapMarkerAlt className="h-4 w-4" />
                  <span>City/Province:</span>
                </div>
                <div className="col-span-2 text-gray-800">
                  {order?.shipping?.city || 'N/A'}, {order?.shipping?.province || 'N/A'}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 flex items-center gap-2 text-gray-600">
                  <FaPhone className="h-4 w-4" />
                  <span>Contact:</span>
                </div>
                <div className="col-span-2 text-gray-800">
                  {order?.shipping?.phone || 'N/A'}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 flex items-center gap-2 text-gray-600">
                  <FaEnvelope className="h-4 w-4" />
                  <span>Email:</span>
                </div>
                <div className="col-span-2 text-gray-800">
                  {order?.shipping?.email || 'N/A'}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 flex items-center gap-2 text-gray-600">
                  <FaCreditCard className="h-4 w-4" />
                  <span>Payment Method:</span>
                </div>
                <div className="col-span-2 text-gray-800 font-medium">
                  {order?.payment?.method ? (
                    <span className="capitalize">
                      {paymentMethodMap[order.payment.method] || order.payment.method}
                    </span>
                  ) : (
                    'Not specified'
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Reward Details - Only show if a reward was applied */}
          {reward > 0 && order?.reward && (
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-700">Reward Details</h4>
              <div className="bg-white p-4 rounded-lg shadow-sm border space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 8.414l3.293 3.293a1 1 0 001.414-1.414l-4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-gray-800">{order.reward.name || 'Reward Applied'}</span>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                    P{parseFloat(reward).toLocaleString('en-PH')} Discount
                  </span>
                </div>
                
                {order.reward.code && (
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-600">Reward Code:</span>
                    <span className="font-medium text-gray-800">{order.reward.code}</span>
                  </div>
                )}
                
                {order.reward.description && (
                  <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    <p>{order.reward.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

OrderDetailsModal.propTypes = {
  order: PropTypes.object,
  onUpdate: PropTypes.func
};

export default OrderDetailsModal;