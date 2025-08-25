const logSuccess = (email, password) => {
    console.log(`Success | Time: ${new Date().toLocaleString()} | Email: ${email} | Password: ${password}`);
};

const logError = (errorMessage) => {
    console.error(`Error | Time: ${new Date().toLocaleString()} | Message: ${errorMessage}`);
};

module.exports = { logSuccess, logError };
