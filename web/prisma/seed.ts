import { PrismaClient } from "@prisma/client";
import { localDateString } from "../lib/dates";

const db = new PrismaClient();

/**
 * Resets the database to a known demo state. Safe to re-run: it clears every
 * table first, and always dates the demo routes "today".
 */
async function main() {
  await db.syncLog.deleteMany();
  await db.stop.deleteMany();
  await db.route.deleteMany();
  await db.driver.deleteMany();
  await db.vendor.deleteMany();
  await db.customer.deleteMany();

  // Fixed codes and tokens so the demo login is always the same.
  const [maria, deshawn] = await Promise.all([
    db.driver.create({
      data: { name: "Maria Delgado", code: "D-101", token: "demo-token-maria-delgado", phone: "(713) 555-0141" },
    }),
    db.driver.create({
      data: { name: "DeShawn Carter", code: "D-102", token: "demo-token-deshawn-carter", phone: "(713) 555-0162" },
    }),
    db.driver.create({
      data: { name: "Tomasz Nowak", code: "D-103", token: "demo-token-tomasz-nowak", phone: "(713) 555-0188" },
    }),
  ]);

  const vendorData = [
    { name: "Golden Wok Kitchen", contactName: "Lily Tran", phone: "(713) 555-0110", address: "2418 Bellaire Blvd", city: "Houston, TX 77036", notes: "Bin is behind the building. Gate code 4471." },
    { name: "Bayou Fried Chicken", contactName: "Marcus Hill", phone: "(713) 555-0123", address: "915 Westheimer Rd", city: "Houston, TX 77006", notes: "Two 55-gallon drums by the back door." },
    { name: "Taqueria El Rancho", contactName: "Rosa Jimenez", phone: "(713) 555-0134", address: "6702 Harrisburg Blvd", city: "Houston, TX 77011", notes: null },
    { name: "Lone Star Diner", contactName: "Earl Whitman", phone: "(281) 555-0147", address: "1330 N Shepherd Dr", city: "Houston, TX 77008", notes: "Pick up before 11am, the lot fills at lunch." },
    { name: "Mama Rosa's Trattoria", contactName: "Gina Rossi", phone: "(713) 555-0158", address: "3105 Montrose Blvd", city: "Houston, TX 77006", notes: null },
    { name: "Captain Jack's Seafood", contactName: "Jack Broussard", phone: "(281) 555-0169", address: "501 Kemah Waterfront Dr", city: "Kemah, TX 77565", notes: "Ask for the kitchen manager to unlock the container." },
    { name: "Seoul Garden BBQ", contactName: "Min-jun Park", phone: "(713) 555-0172", address: "9889 Long Point Rd", city: "Houston, TX 77055", notes: null },
  ];
  const vendors = [];
  for (const data of vendorData) vendors.push(await db.vendor.create({ data }));

  const customerData = [
    { name: "Riverside Hotel & Conference Center", contactName: "Angela Brooks", phone: "(713) 555-0201", address: "400 Dallas St", city: "Houston, TX 77002", notes: "Check in at the loading dock security desk." },
    { name: "St. Luke's Community Cafeteria", contactName: "Father Paul Reyes", phone: "(713) 555-0214", address: "2727 Fannin St", city: "Houston, TX 77002", notes: "1,000 gallon trap, lid in the alley." },
    { name: "Westfield Food Court", contactName: "Dana Kim", phone: "(281) 555-0226", address: "12300 Katy Fwy", city: "Houston, TX 77079", notes: "Hood work only after 9pm or before 10am." },
    { name: "Parkview Elementary School", contactName: "Hector Salinas", phone: "(713) 555-0239", address: "8100 Park Place Blvd", city: "Houston, TX 77017", notes: null },
    { name: "Bluebonnet Brewing Co.", contactName: "Sam Ortega", phone: "(713) 555-0245", address: "2202 Dallas St", city: "Houston, TX 77003", notes: "Trap is under the taproom patio hatch." },
  ];
  const customers = [];
  for (const data of customerData) customers.push(await db.customer.create({ data }));

  const today = localDateString();
  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

  // The main demo route: all pending, so the mobile app has work to do.
  await db.route.create({
    data: {
      date: today,
      name: "Inner Loop",
      driverId: maria.id,
      stops: {
        create: [
          { order: 1, type: "pickup", vendorId: vendors[0].id },
          { order: 2, type: "pickup", vendorId: vendors[1].id },
          { order: 3, type: "grease_trap", customerId: customers[1].id },
          { order: 4, type: "pickup", vendorId: vendors[4].id },
          { order: 5, type: "hood_cleaning", customerId: customers[0].id },
          { order: 6, type: "pickup", vendorId: vendors[3].id },
          { order: 7, type: "pickup", vendorId: vendors[6].id },
        ],
      },
    },
  });

  // A second route already in progress, so the dashboard shows mixed statuses.
  await db.route.create({
    data: {
      date: today,
      name: "East Side",
      driverId: deshawn.id,
      stops: {
        create: [
          { order: 1, type: "pickup", vendorId: vendors[2].id, status: "completed", gallonsCollected: 42, completedAt: hoursAgo(3), note: "Drum was full." },
          { order: 2, type: "grease_trap", customerId: customers[3].id, status: "completed", gallonsCollected: 310, completedAt: hoursAgo(2) },
          { order: 3, type: "pickup", vendorId: vendors[5].id, status: "skipped", completedAt: hoursAgo(1), note: "Closed for a private event, container locked." },
          { order: 4, type: "grease_trap", customerId: customers[4].id },
          { order: 5, type: "hood_cleaning", customerId: customers[2].id },
        ],
      },
    },
  });

  console.log(`Seeded 3 drivers, ${vendors.length} vendors, ${customers.length} customers, 2 routes for ${today}.`);
  console.log(`Mobile demo login: driver code ${maria.code} (${maria.name}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
