const path = require("path");
const fs = require("fs");

const Resident = require("../models/Resident");

const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

/*
 * =========================================================
 * TA-HOSS LOG EXPORT CONTROLLER
 * =========================================================
 *
 * Supports:
 *
 * 1. Excel resident registry export
 * 2. Professional PDF resident registry export
 *
 * PDF includes:
 * - TA-HOSS LOG logo
 * - Professional organization header
 * - Export metadata
 * - Styled table
 * - Repeating table headers
 * - Page numbering
 * - Professional footer
 *
 * =========================================================
 */


/*
 * =========================================================
 * LOGO PATH
 * =========================================================
 *
 * Expected frontend logo:
 *
 * frontend/public/ta-hoss-logo.png
 *
 * We check several possible locations so the backend
 * remains flexible depending on project structure.
 * =========================================================
 */

const getLogoPath = () => {
  const possiblePaths = [
    path.join(
      __dirname,
      "../../frontend/public/ta-hoss-logo.png"
    ),

    path.join(
      process.cwd(),
      "frontend",
      "public",
      "ta-hoss-logo.png"
    ),

    path.join(
      process.cwd(),
      "..",
      "frontend",
      "public",
      "ta-hoss-logo.png"
    ),
  ];

  for (const logoPath of possiblePaths) {
    if (fs.existsSync(logoPath)) {
      return logoPath;
    }
  }

  return null;
};


/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const buildResidentFilter = (query = {}) => {
  const {
    search,
    verificationStatus,
    identityStatus,
    status,
    gender,
    household,
  } = query;

  const filter = {
    deletedAt: null,
  };

  /*
   * SEARCH
   */

  if (search && search.trim()) {
    const searchValue = search.trim();

    filter.$or = [
      {
        residentId: {
          $regex: searchValue,
          $options: "i",
        },
      },

      {
        firstName: {
          $regex: searchValue,
          $options: "i",
        },
      },

      {
        middleName: {
          $regex: searchValue,
          $options: "i",
        },
      },

      {
        lastName: {
          $regex: searchValue,
          $options: "i",
        },
      },

      {
        phoneNumber: {
          $regex: searchValue,
          $options: "i",
        },
      },
    ];
  }

  if (verificationStatus) {
    filter.verificationStatus = verificationStatus;
  }

  if (identityStatus) {
    filter.identityStatus = identityStatus;
  }

  if (status) {
    filter.status = status;
  }

  if (gender) {
    filter.gender = gender;
  }

  if (household) {
    filter.household = household;
  }

  return filter;
};


/*
 * =========================================================
 * FORMAT HELPERS
 * =========================================================
 */

const formatName = (resident) => {
  return [
    resident?.firstName,
    resident?.middleName,
    resident?.lastName,
  ]
    .filter(Boolean)
    .join(" ");
};


const formatLabel = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "N/A";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};


const formatDate = (date) => {
  if (!date) {
    return "N/A";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};


const formatDateTime = (date) => {
  if (!date) {
    return "N/A";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};


const safeValue = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "N/A";
  }

  return String(value);
};


/*
 * =========================================================
 * GET RESIDENTS FOR EXPORT
 * =========================================================
 */

const getResidentsForExport = async (req) => {
  const filter = buildResidentFilter(
    req.query
  );

  const residents = await Resident.find(
    filter
  )
    .populate(
      "household",
      "householdId compound houseNumber community"
    )
    .populate(
      "registeredBy",
      "fullname username role"
    )
    .populate(
      "verifiedBy",
      "fullname username role"
    )
    .sort({
      createdAt: -1,
      lastName: 1,
      firstName: 1,
    })
    .lean();

  return residents;
};


/*
 * =========================================================
 * EXCEL EXPORT
 * =========================================================
 */

const exportResidentsExcel = async (
  req,
  res
) => {
  try {
    const residents =
      await getResidentsForExport(req);

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator = "TA-HOSS LOG";

    workbook.lastModifiedBy =
      req.user?.fullname ||
      req.user?.username ||
      "TA-HOSS LOG";

    workbook.created = new Date();
    workbook.modified = new Date();

    workbook.properties = {
      title:
        "TA-HOSS LOG Resident Registry",

      subject:
        "Registered Residents of Ta-hoss Community",

      keywords:
        "TA-HOSS, residents, registry, community",

      category:
        "Resident Registry",
    };


    /*
     * WORKSHEET
     */

    const worksheet =
      workbook.addWorksheet(
        "Residents Registry",
        {
          properties: {
            defaultRowHeight: 20,
          },

          pageSetup: {
            orientation: "landscape",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            paperSize: 9,
          },
        }
      );


    /*
     * TITLE
     */

    worksheet.mergeCells(
      "A1:Q1"
    );

    const titleCell =
      worksheet.getCell("A1");

    titleCell.value =
      "TA-HOSS COMMUNITY RESIDENT REGISTRY";

    titleCell.font = {
      bold: true,
      size: 16,
    };

    titleCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.getRow(1).height = 30;


    /*
     * SUBTITLE
     */

    worksheet.mergeCells(
      "A2:Q2"
    );

    const subtitleCell =
      worksheet.getCell("A2");

    subtitleCell.value =
      "Official Registered Residents — Ta-hoss Community, Riyom LGA, Plateau State";

    subtitleCell.font = {
      italic: true,
      size: 10,
    };

    subtitleCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };


    /*
     * EXPORT INFORMATION
     */

    worksheet.mergeCells(
      "A3:Q3"
    );

    const exportInfoCell =
      worksheet.getCell("A3");

    exportInfoCell.value =
      `Generated: ${formatDateTime(
        new Date()
      )} | Total Residents: ${
        residents.length
      }`;

    exportInfoCell.font = {
      size: 9,
    };

    exportInfoCell.alignment = {
      horizontal: "center",
    };


    /*
     * HEADERS
     */

    const headerRowNumber = 5;

    const headers = [
      "S/N",
      "Resident ID",
      "Full Name",
      "Gender",
      "Date of Birth",
      "Phone Number",
      "Marital Status",
      "Occupation",
      "Education Level",
      "Relationship to Head",
      "Household ID",
      "Compound",
      "House Number",
      "Verification",
      "Identity",
      "Status",
      "Registered Date",
    ];

    const headerRow =
      worksheet.getRow(
        headerRowNumber
      );

    headers.forEach(
      (header, index) => {
        const cell =
          headerRow.getCell(
            index + 1
          );

        cell.value = header;

        cell.font = {
          bold: true,
          size: 10,
        };

        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };

        cell.border = {
          top: {
            style: "thin",
          },

          left: {
            style: "thin",
          },

          bottom: {
            style: "thin",
          },

          right: {
            style: "thin",
          },
        };
      }
    );

    headerRow.height = 32;


    /*
     * DATA
     */

    residents.forEach(
      (resident, index) => {
        const row =
          worksheet.addRow([
            index + 1,

            safeValue(
              resident.residentId
            ),

            formatName(
              resident
            ) || "N/A",

            formatLabel(
              resident.gender
            ),

            formatDate(
              resident.dateOfBirth
            ),

            safeValue(
              resident.phoneNumber
            ),

            formatLabel(
              resident.maritalStatus
            ),

            safeValue(
              resident.occupation
            ),

            formatLabel(
              resident.educationLevel
            ),

            formatLabel(
              resident.relationshipToHead
            ),

            safeValue(
              resident.household
                ?.householdId
            ),

            safeValue(
              resident.household
                ?.compound
            ),

            safeValue(
              resident.household
                ?.houseNumber
            ),

            formatLabel(
              resident.verificationStatus
            ),

            formatLabel(
              resident.identityStatus
            ),

            formatLabel(
              resident.status
            ),

            formatDate(
              resident.createdAt
            ),
          ]);


        row.eachCell(
          (cell) => {
            cell.alignment = {
              vertical: "middle",
              wrapText: true,
            };

            cell.border = {
              top: {
                style: "hair",
              },

              left: {
                style: "hair",
              },

              bottom: {
                style: "hair",
              },

              right: {
                style: "hair",
              },
            };
          }
        );
      }
    );


    /*
     * ALTERNATING ROWS
     */

    for (
      let rowNumber =
        headerRowNumber + 1;

      rowNumber <=
        worksheet.rowCount;

      rowNumber++
    ) {
      const row =
        worksheet.getRow(
          rowNumber
        );

      if (
        (rowNumber -
          headerRowNumber) %
          2 ===
        0
      ) {
        row.eachCell(
          (cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: {
                argb: "F8FAFC",
              },
            };
          }
        );
      }
    }


    /*
     * COLUMN WIDTHS
     */

    const widths = [
      7,
      18,
      28,
      12,
      16,
      18,
      17,
      22,
      20,
      22,
      18,
      20,
      16,
      16,
      16,
      14,
      18,
    ];

    widths.forEach(
      (width, index) => {
        worksheet.getColumn(
          index + 1
        ).width = width;
      }
    );


    /*
     * FREEZE HEADER
     */

    worksheet.views = [
      {
        state: "frozen",
        ySplit: headerRowNumber,
      },
    ];


    /*
     * AUTO FILTER
     */

    worksheet.autoFilter = {
      from:
        `A${headerRowNumber}`,

      to:
        `Q${headerRowNumber}`,
    };


    /*
     * FOOTER
     */

    worksheet.headerFooter.oddFooter =
      "&LTA-HOSS LOG&CPage &P of &N&RGenerated &D";


    /*
     * RESPONSE
     */

    const filename =
      `TA-HOSS-Residents-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    await workbook.xlsx.write(
      res
    );

    res.end();

  } catch (error) {

    console.error(
      "RESIDENT EXCEL EXPORT ERROR:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,

        message:
          "Unable to export resident records to Excel.",
      });
    }
  }
};


/*
 * =========================================================
 * PDF HELPERS
 * =========================================================
 */

const drawPdfHeader = (
  doc,
  logoPath,
  totalResidents,
  generatedAt
) => {

  const pageWidth =
    doc.page.width -
    doc.page.margins.left -
    doc.page.margins.right;

  const startX =
    doc.page.margins.left;

  const startY = 28;

  /*
   * HEADER AREA
   */

  doc
    .save()
    .lineWidth(1)
    .strokeColor("#D1D5DB")
    .rect(
      startX,
      startY,
      pageWidth,
      75
    )
    .stroke()
    .restore();


  /*
   * LOGO
   */

  if (logoPath) {

    try {

      doc.image(
        logoPath,
        startX + 10,
        startY + 9,
        {
          fit: [58, 58],
          align: "center",
          valign: "center",
        }
      );

    } catch (logoError) {

      console.error(
        "PDF LOGO LOAD ERROR:",
        logoError
      );
    }

  } else {

    /*
     * Fallback avatar when logo is
     * unavailable.
     */

    doc
      .save()
      .circle(
        startX + 39,
        startY + 37,
        27
      )
      .fill("#EFF6FF")
      .restore();

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#1D4ED8")
      .text(
        "TH",
        startX + 25,
        startY + 31,
        {
          width: 28,
          align: "center",
        }
      );
  }


  /*
   * ORGANIZATION NAME
   */

  const textX =
    startX + 82;

  doc
    .fillColor("#0F172A")
    .font("Helvetica-Bold")
    .fontSize(17)
    .text(
      "TA-HOSS LOG",
      textX,
      startY + 10
    );


  /*
   * MAIN TITLE
   */

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#1E293B")
    .text(
      "COMMUNITY RESIDENT REGISTRY",
      textX,
      startY + 31
    );


  /*
   * LOCATION
   */

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#64748B")
    .text(
      "Ta-hoss Community • Riyom LGA • Plateau State • Nigeria",
      textX,
      startY + 49
    );


  /*
   * RIGHT SIDE METADATA
   */

  const metaX =
    startX +
    pageWidth -
    155;

  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor("#475569")
    .text(
      "REGISTRY EXPORT",
      metaX,
      startY + 14,
      {
        width: 145,
        align: "right",
      }
    );

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#64748B")
    .text(
      `Residents: ${totalResidents}`,
      metaX,
      startY + 31,
      {
        width: 145,
        align: "right",
      }
    );

  doc.text(
    `Generated: ${formatDateTime(
      generatedAt
    )}`,
    metaX,
    startY + 44,
    {
      width: 145,
      align: "right",
    }
  );


  /*
   * BOTTOM ACCENT LINE
   */

  doc
    .save()
    .lineWidth(2)
    .strokeColor("#2563EB")
    .moveTo(
      startX,
      startY + 75
    )
    .lineTo(
      startX + pageWidth,
      startY + 75
    )
    .stroke()
    .restore();


  doc.y =
    startY + 91;
};


/*
 * =========================================================
 * PDF TABLE HEADER
 * =========================================================
 */

const drawPdfTableHeader = (
  doc,
  columns,
  rowHeight
) => {

  const startX =
    doc.page.margins.left;

  const startY =
    doc.y;

  let x = startX;

  doc
    .save()
    .fillColor("#EFF6FF")
    .rect(
      startX,
      startY,
      columns.reduce(
        (sum, column) =>
          sum + column.width,
        0
      ),
      rowHeight
    )
    .fill()
    .restore();


  doc
    .font("Helvetica-Bold")
    .fontSize(6.7)
    .fillColor("#0F172A");


  columns.forEach(
    (column) => {

      doc
        .save()
        .lineWidth(0.5)
        .strokeColor("#CBD5E1")
        .rect(
          x,
          startY,
          column.width,
          rowHeight
        )
        .stroke()
        .restore();


      doc.text(
        column.label,
        x + 3,
        startY + 8,
        {
          width:
            column.width - 6,

          height:
            rowHeight - 10,

          align: "center",

          valign: "center",
        }
      );


      x += column.width;
    }
  );


  doc.y =
    startY + rowHeight;
};


/*
 * =========================================================
 * PDF ROW
 * =========================================================
 */

const drawPdfRow = (
  doc,
  columns,
  row,
  rowHeight,
  alternate
) => {

  const startX =
    doc.page.margins.left;

  const startY =
    doc.y;

  let x = startX;


  /*
   * Alternate row background
   */

  if (alternate) {

    doc
      .save()
      .fillColor("#F8FAFC")
      .rect(
        startX,
        startY,
        columns.reduce(
          (sum, column) =>
            sum + column.width,
          0
        ),
        rowHeight
      )
      .fill()
      .restore();
  }


  doc
    .font("Helvetica")
    .fontSize(6.2)
    .fillColor("#334155");


  columns.forEach(
    (column) => {

      doc
        .save()
        .lineWidth(0.35)
        .strokeColor("#E2E8F0")
        .rect(
          x,
          startY,
          column.width,
          rowHeight
        )
        .stroke()
        .restore();


      doc.text(
        safeValue(
          row[column.key]
        ),
        x + 3,
        startY + 7,
        {
          width:
            column.width - 6,

          height:
            rowHeight - 8,

          align:
            column.key === "sn"
              ? "center"
              : "left",

          ellipsis: true,
        }
      );


      x += column.width;
    }
  );


  doc.y =
    startY + rowHeight;
};


/*
 * =========================================================
 * PDF EXPORT
 * =========================================================
 */

const exportResidentsPDF = async (
  req,
  res
) => {

  try {

    const residents =
      await getResidentsForExport(req);


    const filename =
      `TA-HOSS-Residents-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;


    /*
     * RESPONSE HEADERS
     */

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );


    /*
     * PDF DOCUMENT
     */

    const doc =
      new PDFDocument({
        size: "A4",

        layout: "landscape",

        margins: {
          top: 30,
          bottom: 35,
          left: 28,
          right: 28,
        },

        bufferPages: true,

        info: {
          Title:
            "TA-HOSS LOG Community Resident Registry",

          Author:
            "TA-HOSS LOG",

          Subject:
            "Registered Residents of Ta-hoss Community",

          Creator:
            "TA-HOSS LOG Community Management System",

          Keywords:
            "TA-HOSS, residents, registry, Ta-hoss Community",
        },
      });


    doc.pipe(res);


    /*
     * LOGO
     */

    const logoPath =
      getLogoPath();


    /*
     * TABLE CONFIGURATION
     */

    const columns = [

      {
        key: "sn",
        label: "S/N",
        width: 30,
      },

      {
        key: "residentId",
        label: "Resident ID",
        width: 72,
      },

      {
        key: "name",
        label: "Full Name",
        width: 110,
      },

      {
        key: "gender",
        label: "Gender",
        width: 50,
      },

      {
        key: "dob",
        label: "DOB",
        width: 62,
      },

      {
        key: "phone",
        label: "Phone",
        width: 80,
      },

      {
        key: "household",
        label: "Household",
        width: 70,
      },

      {
        key: "relationship",
        label: "Relationship",
        width: 70,
      },

      {
        key: "verification",
        label: "Verification",
        width: 65,
      },

      {
        key: "identity",
        label: "Identity",
        width: 60,
      },

      {
        key: "status",
        label: "Status",
        width: 55,
      },
    ];


    /*
     * FIT TABLE TO PAGE
     */

    const tableWidth =
      columns.reduce(
        (sum, column) =>
          sum + column.width,
        0
      );


    const pageWidth =
      doc.page.width -
      doc.page.margins.left -
      doc.page.margins.right;


    const scale =
      pageWidth /
      tableWidth;


    const scaledColumns =
      columns.map(
        (column) => ({
          ...column,

          width:
            column.width *
            scale,
        })
      );


    /*
     * HEADER
     */

    drawPdfHeader(
      doc,
      logoPath,
      residents.length,
      new Date()
    );


    /*
     * EXPORT FILTER INFORMATION
     */

    const activeFilters = [];

    if (req.query.search) {
      activeFilters.push(
        `Search: ${req.query.search}`
      );
    }

    if (
      req.query.gender
    ) {
      activeFilters.push(
        `Gender: ${formatLabel(
          req.query.gender
        )}`
      );
    }

    if (
      req.query.verificationStatus
    ) {
      activeFilters.push(
        `Verification: ${formatLabel(
          req.query.verificationStatus
        )}`
      );
    }

    if (
      req.query.identityStatus
    ) {
      activeFilters.push(
        `Identity: ${formatLabel(
          req.query.identityStatus
        )}`
      );
    }

    if (
      req.query.status
    ) {
      activeFilters.push(
        `Status: ${formatLabel(
          req.query.status
        )}`
      );
    }

    if (
      req.query.household
    ) {
      activeFilters.push(
        `Household: ${req.query.household}`
      );
    }


    if (activeFilters.length) {

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#64748B")
        .text(
          `Applied filters: ${activeFilters.join(
            " • "
          )}`
        );

      doc.moveDown(0.5);
    }


    /*
     * TABLE
     */

    const rowHeight = 28;

    drawPdfTableHeader(
      doc,
      scaledColumns,
      rowHeight
    );


    /*
     * DATA
     */

    residents.forEach(
      (resident, index) => {

        /*
         * New page
         */

        if (
          doc.y +
            rowHeight >
          doc.page.height -
            doc.page.margins.bottom -
            25
        ) {

          doc.addPage();


          /*
           * Compact repeated header
           */

          drawPdfHeader(
            doc,
            logoPath,
            residents.length,
            new Date()
          );


          drawPdfTableHeader(
            doc,
            scaledColumns,
            rowHeight
          );
        }


        const row = {

          sn:
            String(
              index + 1
            ),

          residentId:
            safeValue(
              resident.residentId
            ),

          name:
            formatName(
              resident
            ) || "N/A",

          gender:
            formatLabel(
              resident.gender
            ),

          dob:
            formatDate(
              resident.dateOfBirth
            ),

          phone:
            safeValue(
              resident.phoneNumber
            ),

          household:
            safeValue(
              resident.household
                ?.householdId
            ),

          relationship:
            formatLabel(
              resident.relationshipToHead
            ),

          verification:
            formatLabel(
              resident.verificationStatus
            ),

          identity:
            formatLabel(
              resident.identityStatus
            ),

          status:
            formatLabel(
              resident.status
            ),
        };


        drawPdfRow(
          doc,
          scaledColumns,
          row,
          rowHeight,
          index % 2 === 1
        );
      }
    );


    /*
     * NO DATA
     */

    if (
      residents.length === 0
    ) {

      doc.moveDown(1);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#64748B")
        .text(
          "No resident records matched the selected criteria.",
          {
            align: "center",
          }
        );
    }


    /*
     * FOOTERS
     */

    const range =
      doc.bufferedPageRange();


    for (
      let i = range.start;

      i <
      range.start +
        range.count;

      i++
    ) {

      doc.switchToPage(i);


      const footerY =
        doc.page.height -
        25;


      /*
       * Footer separator
       */

      doc
        .save()
        .lineWidth(0.5)
        .strokeColor("#CBD5E1")
        .moveTo(
          doc.page.margins.left,
          footerY - 7
        )
        .lineTo(
          doc.page.width -
            doc.page.margins.right,
          footerY - 7
        )
        .stroke()
        .restore();


      /*
       * Footer text
       */

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#64748B")
        .text(
          "TA-HOSS LOG • Official Community Resident Registry",
          doc.page.margins.left,
          footerY,
          {
            width:
              pageWidth / 2,
            align: "left",
          }
        );


      doc.text(
        `Page ${
          i + 1
        } of ${
          range.count
        }`,
        doc.page.margins.left +
          pageWidth / 2,
        footerY,
        {
          width:
            pageWidth / 2,
          align: "right",
        }
      );
    }


    /*
     * FINISH PDF
     */

    doc.end();

  } catch (error) {

    console.error(
      "RESIDENT PDF EXPORT ERROR:",
      error
    );


    if (
      !res.headersSent
    ) {

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to export resident records to PDF.",
        });
    }
  }
};


/*
 * =========================================================
 * EXPORTS
 * =========================================================
 */

module.exports = {
  exportResidentsExcel,
  exportResidentsPDF,
};