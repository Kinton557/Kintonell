const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Payonify backend is running.");
});

app.post("/api/payment", async (req, res) => {

    try {

        const { amount, phone } = req.body;

        if (!amount || !phone) {
            return res.status(400).json({
                error: "Amount and phone number are required."
            });
        }

        // Payonify secret key will be stored privately
        // in Render as PAYONIFY_SECRET_KEY.
        const secretKey = process.env.PAYONIFY_SECRET_KEY;

        if (!secretKey) {
            return res.status(500).json({
                error: "Payonify secret key is not configured."
            });
        }

        const response = await fetch(
            "https://api.payonify.com/v1/charges",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        "Basic " +
                        Buffer.from(
                            secretKey + ":"
                        ).toString("base64"),

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    amount: Math.round(
                        Number(amount) * 100
                    ),

                    currency: "usd",

                    source: "pos",

                    description:
                        "Website payment",

                    payment_method: {

                        mobile_money: {

                            ecocash: {

                                mobile_number:
                                    phone

                            }

                        }

                    }

                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            return res.status(response.status).json({
                error:
                    data.message ||
                    data.error ||
                    "Payonify payment failed."
            });

        }

        return res.json({

            status:
                data.status || "pending",

            id:
                data.id,

            message:
                "Payment request sent."

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            error:
                "Unable to start payment."

        });

    }

});

app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});
