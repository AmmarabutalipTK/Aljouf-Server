        //@ts-ignore
import fs from "fs";
        //@ts-ignore
import csv from "csv-parser";

import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

function readCsv(path: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];

    fs.createReadStream(path)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;

  const date = new Date(value);

  return isNaN(date.getTime()) ? undefined : date;
}

function parseQuantity(value?: string): number | null {
  if (!value) return null;

  const v = value.trim();

  const map: Record<string, number> = {
    "واحد": 1,
    "اثنين": 2,
    "اثنان": 2,
    "ثلاثة": 3,
    "أربعة": 4,
    "خمسة": 5,
  };

  if (map[v]) return map[v];

  const parsed = Number(v);

  return Number.isNaN(parsed) ? null : parsed;
}


async function importComplaints() {
  const rows = await readCsv("./data/complaints.csv");

  for (const row of rows) {
    // تنظيف أسماء الأعمدة من المسافات الخفية
    const cleanRow = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.trim(),
        typeof value === "string"
          ? value.trim()
          : value,
      ])
    );

    console.log(
      "Complaint Status:",
      JSON.stringify(
        cleanRow["حالة الشكوى"]
      )
    );

    await prisma.ticket.create({
      data: {
        category: Category.COMPLAINT,

        //@ts-ignore
        customerName:
          cleanRow["اسم العميل"],

        phone:
          cleanRow[
            "رقم الهاتف"
          ]?.toString(),
        //@ts-ignore

        description:
          cleanRow[
            "الشكوى او الملاحظة"
          ],
        //@ts-ignore

        complaintStatus:
          cleanRow[
            "حالة الشكوى"
          ] || null,

        complaintSubmittedAt:
          parseDate(
        //@ts-ignore
            cleanRow[
              "تاريخ تقديم الشكوى"
            ]
          ),

        botPhone:
          cleanRow[
            "رقم الهاتف المحاكي للبوت"
          ]?.toString(),
        //@ts-ignore
        aljoufNote:
          cleanRow[
            "ملاحظة الجوف"
          ],
        //@ts-ignore
        customerNote:
          cleanRow[
            "ملاحظة خدمة العملاء"
          ],
      },
    });
  }

  console.log(
    `Imported ${rows.length} complaints`
  );
}
async function importModifications() {
  const rows = await readCsv("./data/order-modifications.csv");

  for (const row of rows) {
    await prisma.ticket.create({
      data: {
        category: Category.ORDER_MODIFICATION,

        orderNumber: row["رقم الطلب"]?.toString(),

        operation: row["العملية"],
        productType: row["نوع المنتج"],

        quantity: parseQuantity(row["الكمية"]),

        botPhone: row["رقم الهاتف المحاكي للبوت"]?.toString(),

        imageUrl: row["صورة المنتج"],

        aljoufNote: row["ملاحظة الجوف"],
        customerNote: row["ملاحظة خدمة العملاء"],
      },
    });
  }

  console.log(`Imported ${rows.length} modifications`);
}

async function importCancellations() {
  const rows = await readCsv("./data/cancellations.csv");

  for (const row of rows) {
    await prisma.ticket.create({
      data: {
        category: Category.ORDER_CANCELLATION,

        orderNumber: row["رقم الطلب"]?.toString(),
        operation: row["العملية"],
        productType: row["نوع المنتج"],
        quantity: parseQuantity(row["الكمية"]),

        botPhone: row["رقم الهاتف المحاكي للبوت"]?.toString(),

        complaintSubmittedAt: parseDate(row["تاريخ تقديم الشكوى"]),

        imageUrl: row["صورة المنتج"],

        aljoufNote: row["ملاحظة الجوف "] || row["ملاحظة الجوف"],
        customerNote: row["ملاحظة خدمة العملاء "] || row["ملاحظة خدمة العملاء"],
      },
    });
  }

  console.log(`Imported ${rows.length} cancellations`);
}

async function importReturns() {
  const rows = await readCsv("./data/returns.csv");

  await prisma.ticket.createMany({
    data: rows.map((row) => ({
      category: Category.RETURN_REPLACEMENT,

      orderNumber: row["رقم الطلب"]?.toString(),

      shipmentNumber: row["رقم الشحنة"]?.toString(),

      phone: row["رقم الهاتف"]?.toString(),

      subCategory: row["الفئة"],
      itemStatus: row["هل تم استلام الطلب بحالة جيدة"],

      reason: row["السبب"],

      imageUrl: row["صورة الطلب المستلم"],

      botPhone: row["رقم الهاتف المحاكي للبوت"]?.toString(),

      aljoufNote: row["ملاحظة الجوف "] || row["ملاحظة الجوف"],

      customerNote:
        row["ملاحظة خدمة العملاء "] ||
        row["ملاحظة خدمة العملاء"],

      complaintSubmittedAt: parseDate(row["تاريخ رفع الطلب"]),
    })),
  });

  console.log(`Imported ${rows.length} returns`);
}

async function importDelays() {
  const rows = await readCsv("./data/delays.csv");

  await prisma.ticket.createMany({
    data: rows.map((row) => ({
      category: Category.ORDER_DELAY_ERROR,

      orderNumber: row["رقم الطلب"]?.toString(),

      phone: row["رقم الهاتف"]?.toString(),

      title: row["فئة المشكلة"],

      subCategory: row["تصنيف المشكلة"],

      description: row["وصف المشكلة"],

      location: row["الموقع"],

      imageUrl: row["صورة المنتج"],

      botPhone: row["رقم الهاتف المحاكي للبوت"]?.toString(),

      aljoufNote: row["ملاحظة الجوف "] || row["ملاحظة الجوف"],

      customerNote:
        row["ملاحظة خدمة العملاء "] ||
        row["ملاحظة خدمة العملاء"],

      complaintSubmittedAt: parseDate(row["تاريخ رفع الشكوى"]),
    })),
  });

  console.log(`Imported ${rows.length} delays`);
}

async function main() {
  await prisma.ticket.deleteMany();

  await importComplaints();

  await importModifications();

  await importCancellations();

  await importReturns();

  await importDelays();

  const count = await prisma.ticket.count();

  console.log(`Import completed (${count} records)`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });