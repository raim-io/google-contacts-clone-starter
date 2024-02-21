import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import Contact from 'App/Models/Contact'
import { ContactFactory } from 'Database/factories'

test.group('Contacts index', (group) => {
  /**
   * create a reversible global transaction for each test
   */
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()

    return () => Database.rollbackGlobalTransaction()
  })

  // Write your test here

  test('return an empty list when the contacts table is empty', async ({ assert, client }) => {
    // wipe database clean
    await Contact.query().delete()

    const response = await client.get('/contacts').qs({
      perPage: 5,
      page: 1,
    })

    const responseBody = JSON.parse(response.text()) // parse JSON to string object
    const responseData = responseBody.data // access response data object
    const responseDataArray = responseData.data // access data array

    response.dumpBody()
    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        meta: {
          total: 0,
          per_page: 5,
          current_page: 1,
          last_page: 1,
          first_page: 1,
          first_page_url: '/?page=1',
          last_page_url: '/?page=1',
          next_page_url: null,
          previous_page_url: null,
        },
        data: [],
      },
    })

    assert.isArray(responseDataArray)
    assert.lengthOf(responseDataArray, 0)
  })

  test('return a paginated list of contacts according to the query strings', async ({ client }) => {
    await Contact.query().delete()

    // create DB records via Factory & faker
    await ContactFactory.query().createMany(25)

    const response = await client.get('/contacts').qs({
      perPage: 5,
      page: 3,
    })

    response.dumpBody()
    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        meta: {
          total: 25,
          per_page: 5,
          current_page: 3,
          last_page: 5,
          first_page: 1,
          first_page_url: '/?page=1',
          last_page_url: '/?page=5',
          next_page_url: '/?page=4',
          previous_page_url: '/?page=2',
        },
        data: [],
      },
    })
  })

  test('paginated response body includes contact data whose ids are the same within the database', async ({
    assert,
    client,
  }) => {
    await Contact.query().delete()
    await ContactFactory.query().createMany(35)

    const response = await client.get('/contacts').qs({
      perPage: 5,
      page: 3,
    })

    const responseBody = response.body()
    const responseArrayData = responseBody.data.data

    response.dumpBody()

    const contacts = await Contact.query().limit(5).offset(10).orderBy('first_name', 'asc')

    // get the contact ids from the client response and cantact query
    const contactsElementIds: string[] = contacts.map((contact) => contact.$attributes.id)
    const responseArrayDataElementIds: string[] = responseArrayData.map((contact) => contact.id)

    contacts.map((contact) => {
      const contactsData = contact.$attributes
      const foundContact = responseArrayData.find(
        (responseArrayDataObject) => contactsData.id === responseArrayDataObject.id
      )

      assert.isDefined(foundContact, 'contact not found!')
    })

    assert.deepEqual(contactsElementIds, responseArrayDataElementIds, 'Response unmatched')
    response.assertBodyContains({
      data: {
        meta: {
          total: 35,
          per_page: 5,
          current_page: 3,
          last_page: 7,
          first_page: 1,
          first_page_url: '/?page=1',
          last_page_url: '/?page=7',
          next_page_url: '/?page=4',
          previous_page_url: '/?page=2',
        },
        data: [],
      },
    })
  })
})
