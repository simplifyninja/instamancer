import * as winston from "winston";
import * as Instamancer from ".";
import {Hashtag, IOptions, Location, User} from "./src/api";

jest.setTimeout(120 * 60 * 1000);
/* tslint:disable:no-console */

const hashtags = ["beach", "gym", "puppies", "party", "throwback"];
const locations = ["1110037669039751", "212988663", "933522", "213385402", "228001889"];
const users = ["snoopdogg", "arianagrande", "bbc", "whitehouse", "australia"];

const smallSize = 30;
const mediumSize = 300;
const largeSize = 3000;

const libraryTestOptions: IOptions = {
    logger: winston.createLogger({
        format: winston.format.json(),
        level: "error",
        silent: true,
        transports: [],
    }),
    silent: true,
    total: 10,
};

test("Library", async () => {
    const testHashtag = new Instamancer.Hashtag(hashtags[0], libraryTestOptions);
    const hashtagPosts = [];
    const total = 10;

    for await (const post of testHashtag.generator()) {
        expect(post).toBeDefined();
        hashtagPosts.push(post);
    }
    expect(hashtagPosts.length).toBe(total);

    const testLocation = new Instamancer.Location(locations[0], libraryTestOptions);
    const locationPosts = [];
    for await (const post of testLocation.generator()) {
        expect(post).toBeDefined();
        locationPosts.push(post);
    }
    expect(locationPosts.length).toBe(total);

    const testUser = new Instamancer.User(users[0], libraryTestOptions);
    const userPosts = [];
    for await (const post of testUser.generator()) {
        expect(post).toBeDefined();
        userPosts.push(post);
    }
    expect(userPosts.length).toBe(total);
});

class ApiTestConditions {
    public api: typeof InstagramEndpoint;
    public ids: string[];
    public sizes: number[];

    constructor(api: typeof InstagramEndpoint, ids: string[], sizes: number[]) {
        this.api = api;
        this.ids = ids;
        this.sizes = sizes;
    }
}

class InstagramEndpoint {
    constructor(id: string, options: object = {}) {
        id = null;
        options = null;
    }

    public async* generator() {
        // pass
    }
}

const endpoints: ApiTestConditions[] = [
    new ApiTestConditions(Hashtag, hashtags, [smallSize, mediumSize, largeSize]),
    new ApiTestConditions(Location, locations, [smallSize, mediumSize, largeSize]),
    new ApiTestConditions(User, users, [smallSize, mediumSize]),
];

test("Instagram API limits", async () => {
    for (const endpoint of endpoints) {
        // Get params
        const API = endpoint.api;
        const ids = endpoint.ids;
        const sizes = endpoint.sizes;

        for (const size of sizes) {
            // Decide how many ids to test based on size
            let sizeIds;
            let splitLen = 5;
            if (size === mediumSize) {
                splitLen = 3;
            } else if (size === largeSize) {
                splitLen = 1;
            }
            sizeIds = ids.slice(0, splitLen);

            for (const id of sizeIds) {
                console.log(`Testing ${id} ${size}`);
                // Specify API options
                const options: IOptions = {
                    enableGrafting: true,
                    fullAPI: false,
                    headless: true,
                    logger: winston.createLogger({
                        format: winston.format.json(),
                        level: "error",
                        silent: true,
                        transports: [],
                    }),
                    silent: false,
                    sleepTime: 2,
                    total: size,
                };

                // Create API
                const api = new API(id, options);

                // Get posts
                const posts = [];
                const postIds = new Set();
                for await (const post of api.generator()) {
                    postIds.add(post.node.id);
                    posts.push(post);
                }

                // Assert sizes
                expect(posts.length).toBe(size);

                // Check duplicates
                expect(posts.length).toBe(postIds.size);
            }
        }
    }
});

const apiOptions: IOptions[] = [
    {silent: true},
    {sleepTime: 5},
    {headless: false},
    {enableGrafting: false},
    {fullAPI: true},
];

test("API options", async () => {
    const hashtagId = "vetinari";
    const total = 50;
    const options: IOptions[] = [];

    // No options default
    options.push({});

    // Add options list
    options.concat(apiOptions.map((option) => {
        option.total = total;
        return option;
    }));

    let first = true;
    for (const option of options) {
        const tag = new Hashtag(hashtagId, option);
        const posts = [];

        for await (const post of tag.generator()) {
            expect(post).toBeDefined();
            posts.push(post);
        }

        if (first) {
            first = false;
            expect(posts.length).toBeGreaterThan(total);
        } else {
            expect(posts.length).toBe(total);
        }
    }
});
