
const { auth } = require("../src/config/auth");

async function createUser() {
    try {
        const user = await auth.api.signUpEmail({
            body: {
                email: "perpustakaan@uinsi.ac.id",
                password: "rizal@123",
                name: "Perpustakaan UINSI",
            }
        });
        console.log("User created successfully:", user);
        process.exit(0);
    } catch (error) {
        console.error("Error creating user:", error);
        process.exit(1);
    }
}

createUser();
