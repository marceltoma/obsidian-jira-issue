// Mock Obsidian's requestUrl function
jest.mock('obsidian', () => ({
    requestUrl: jest.fn(),
    Platform: { isMobileApp: false }
}))

import { requestUrl } from 'obsidian'
import JiraClient from '../src/client/jiraClient'
import { IJiraSearchResults } from '../src/interfaces/issueInterfaces'
import { IJiraIssueAccountSettings, EAuthenticationTypes } from '../src/interfaces/settingsInterfaces'

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>

// Mock settings data
jest.mock('../src/settings', () => ({
    SettingsData: {
        logRequestsResponses: false,
        logImagesFetch: false,
        apiBasePath: '/rest/api/3'
    }
}))

describe('JiraClient Migration Tests', () => {
    const mockAccount: IJiraIssueAccountSettings = {
        alias: 'test',
        host: 'https://test.atlassian.net',
        username: 'test@example.com',
        password: 'token123',
        authenticationType: EAuthenticationTypes.BASIC,
        priority: 1,
        color: '#0052CC',
        cache: { statusColor: {}, customFieldsIdToName: {}, customFieldsNameToId: {}, customFieldsType: {}, jqlAutocomplete: { fields: [], functions: {} } }
    }

    const mockSearchResponse: IJiraSearchResults = {
        issues: [{
            id: '123',
            key: 'TEST-123',
            fields: {
                summary: 'Test Issue',
                assignee: null,
                created: '2025-01-01',
                creator: null,
                description: 'Test description',
                duedate: null,
                resolution: null,
                resolutiondate: null,
                issuetype: { iconUrl: '', name: 'Task' },
                priority: { iconUrl: '', name: 'Medium' },
                reporter: null,
                status: { statusCategory: { colorName: 'blue' }, name: 'In Progress', description: '' },
                updated: '2025-01-01',
                environment: null,
                project: { key: 'TEST', name: 'Test Project' },
                labels: [],
                fixVersions: [],
                components: [],
                aggregatetimeestimate: 0,
                aggregatetimeoriginalestimate: 0,
                aggregatetimespent: 0,
                timeestimate: 0,
                timeoriginalestimate: 0,
                timespent: 0,
                issueLinks: [],
                aggregateprogress: { percent: 0 },
                progress: { percent: 0 },
                lastViewed: null,
                worklog: { worklogs: [] }
            },
            account: mockAccount
        }],
        maxResults: 50,
        startAt: 0,
        total: 1,
        nextPageToken: 'next_page_123',
        account: mockAccount
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockRequestUrl.mockResolvedValue({
            status: 200,
            json: mockSearchResponse,
            text: JSON.stringify(mockSearchResponse),
            headers: { 'content-type': 'application/json' },
            arrayBuffer: new ArrayBuffer(0)
        })
    })

    describe('getSearchResults with new JQL endpoint', () => {
        test('should use POST /search/jql endpoint', async () => {
            const query = 'project = TEST'
            
            const result = await JiraClient.getSearchResults(query, { account: mockAccount })
            
            expect(mockRequestUrl).toHaveBeenCalledWith({
                method: 'POST',
                url: 'https://test.atlassian.net/rest/api/3/search/jql',
                headers: {
                    'Authorization': 'Basic dGVzdEBleGFtcGxlLmNvbTp0b2tlbjEyMw=='
                },
                contentType: 'application/json',
                body: JSON.stringify({
                    jql: query,
                    maxResults: 50
                })
            })
            
            expect(result).toEqual(mockSearchResponse)
        })

        test('should handle pagination token', async () => {
            const query = 'project = TEST'
            const nextPageToken = 'token123'
            
            await JiraClient.getSearchResults(query, { 
                account: mockAccount, 
                nextPageToken: nextPageToken 
            })
            
            expect(mockRequestUrl).toHaveBeenCalledWith({
                method: 'POST',
                url: 'https://test.atlassian.net/rest/api/3/search/jql',
                headers: {
                    'Authorization': 'Basic dGVzdEBleGFtcGxlLmNvbTp0b2tlbjEyMw=='
                },
                contentType: 'application/json',
                body: JSON.stringify({
                    jql: query,
                    maxResults: 50,
                    startAt: nextPageToken
                })
            })
        })

        test('should handle backward compatibility with offset', async () => {
            const query = 'project = TEST'
            const offset = 25
            
            await JiraClient.getSearchResults(query, { 
                account: mockAccount, 
                offset: offset 
            })
            
            expect(mockRequestUrl).toHaveBeenCalledWith({
                method: 'POST',
                url: 'https://test.atlassian.net/rest/api/3/search/jql',
                headers: {
                    'Authorization': 'Basic dGVzdEBleGFtcGxlLmNvbTp0b2tlbjEyMw=='
                },
                contentType: 'application/json',
                body: JSON.stringify({
                    jql: query,
                    maxResults: 50,
                    startAt: offset
                })
            })
        })

        test('should include custom fields when specified', async () => {
            const query = 'project = TEST'
            const fields = ['summary', 'assignee', 'customfield_10001']
            
            await JiraClient.getSearchResults(query, { 
                account: mockAccount, 
                fields: fields 
            })
            
            expect(mockRequestUrl).toHaveBeenCalledWith({
                method: 'POST',
                url: 'https://test.atlassian.net/rest/api/3/search/jql',
                headers: {
                    'Authorization': 'Basic dGVzdEBleGFtcGxlLmNvbTp0b2tlbjEyMw=='
                },
                contentType: 'application/json',
                body: JSON.stringify({
                    jql: query,
                    fields: fields,
                    maxResults: 50
                })
            })
        })

        test('should handle custom limit', async () => {
            const query = 'project = TEST'
            const limit = 100
            
            await JiraClient.getSearchResults(query, { 
                account: mockAccount, 
                limit: limit 
            })
            
            expect(mockRequestUrl).toHaveBeenCalledWith({
                method: 'POST',
                url: 'https://test.atlassian.net/rest/api/3/search/jql',
                headers: {
                    'Authorization': 'Basic dGVzdEBleGFtcGxlLmNvbTp0b2tlbjEyMw=='
                },
                contentType: 'application/json',
                body: JSON.stringify({
                    jql: query,
                    maxResults: limit
                })
            })
        })

        test('should handle API errors correctly', async () => {
            const errorResponse = {
                status: 400,
                json: {
                    errorMessages: ['The value "INVALID" does not exist for the field "project".']
                },
                text: JSON.stringify({
                    errorMessages: ['The value "INVALID" does not exist for the field "project".']
                }),
                headers: { 
                    'content-type': {
                        contains: (str: string) => str === 'json'
                    }
                },
                arrayBuffer: new ArrayBuffer(0)
            }
            
            mockRequestUrl.mockRejectedValue(errorResponse)
            
            const query = 'project = INVALID'
            
            await expect(JiraClient.getSearchResults(query, { account: mockAccount }))
                .rejects.toThrow('The value "INVALID" does not exist for the field "project".')
        })
    })
})