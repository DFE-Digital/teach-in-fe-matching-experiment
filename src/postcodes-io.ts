import axios from "axios";

export type PostcodesIOResponse = {
    longitude: number;
    latitude: number;
    region: string;
};

export const getPostcodeData = async (
    postcode,
): Promise<PostcodesIOResponse> => {
    const trimmedPostcode = postcode.replace(/[^A-Za-z0-9]/g, "");

    return (
        await axios.get(
            `https://api.postcodes.io/postcodes/${encodeURIComponent(trimmedPostcode)}`,
        )
    ).data.result;
};
