const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Allow your TrebEdit website to communicate with this backend
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

app.use(express.json());


// ==========================================
// TEST / HOME
// ==========================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Payonify backend is running!"
    });
});


// ==========================================
// CREATE ECOCASH PAYMENT
// ==========================================

app.post("/api/payment", async (req, res) => {

    try {

        let { amount, phone } = req.body;

        // --------------------------------------
        // CHECK INPUT
        // --------------------------------------

        if (!amount || !phone) {
            return res.status(400).json({
                error: "Amount and phone number are required."
            });
        }


        amount = Number(amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                error: "Invalid payment amount."
            });
        }


        // --------------------------------------
        // GET PRIVATE KEYS FROM RENDER
        // --------------------------------------

        const publicKey =
            process.env.PAYONIFY_PUBLIC_KEY;

        const secretKey =
            process.env.PAYONIFY_SECRET_KEY;


        if (!publicKey || !secretKey) {

            console.error(
                "Payonify keys are missing."
            );

            return res.status(500).json({
                error:
                    "Payonify keys are not configured on the server."
            });
        }


        // --------------------------------------
        // CLEAN ECOCASH NUMBER
        // --------------------------------------

        phone = String(phone)
            .replace(/\s+/g, "")
            .replace(/-/g, "");


        // 263771234567 -> 771234567
        if (phone.startsWith("263")) {
            phone = phone.substring(3);
        }

        // 0771234567 -> 771234567
        if (phone.startsWith("0")) {
            phone = phone.substring(1);
        }


        // --------------------------------------
        // CONVERT USD TO CENTS
        // --------------------------------------

        const amountInCents =
            Math.round(amount * 100);


        // --------------------------------------
        // PAYONIFY BASIC AUTH
        // --------------------------------------

        const credentials =
            Buffer
                .from(
                    `${publicKey}:${secretKey}`
                )
                .toString("base64");


        // --------------------------------------
        // SEND CHARGE TO PAYONIFY
        // --------------------------------------

        const response = await fetch(
            "https://api.payonify.com/v1/charges",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Basic ${credentials}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    amount: amountInCents,

                    currency: "usd",

                    source: "web",

                    description:
                        "Website EcoCash Payment",

                    payment_method: {

                        mobile_money: {

                            ecocash: {

                                mobile_number:
                                    phone

                            }

                        }

                    },

                    confirm: true

                })
            }
        );


        // --------------------------------------
        // READ PAYONIFY RESPONSE
        // --------------------------------------

        const data =
            await response.json();


        console.log(
            "Payonify response:",
            JSON.stringify(data)
        );


        // --------------------------------------
        // HANDLE ERROR
        // --------------------------------------

        if (!response.ok) {

            return res.status(
                response.status
            ).json({

                error:
                    data.message ||
                    data.error ||
                    data.failure_reason ||
                    "Payonify payment failed.",

                details: data

            });
        }


        // --------------------------------------
        // SUCCESS
        // --------------------------------------

        return res.json({

            success: true,

            id: data.id,

            status:
                data.status,

            paid:
                data.paid,

            message:
                data.status ===
                "requires_authorization"

                    ? "Payment request sent. Check your EcoCash phone."

                    : "Payment created successfully."

        });


    } catch (error) {

        console.error(
            "SERVER ERROR:",
            error
        );

        return res.status(500).json({

            error:
                "Unable to connect to Payonify."

        });

    }

});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

    console.log(
        `Payonify backend running on port ${PORT}`
    );

});
