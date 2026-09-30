import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seed() {
  console.log('Checking for teams...')
  const { data: existingTeams, error: fetchError } = await supabase.from('teams').select('id')
  if (fetchError) {
    console.error('Error fetching teams:', fetchError)
    return
  }

  if (existingTeams && existingTeams.length > 0) {
    console.log(`Found ${existingTeams.length} teams. Skipping seed.`)
    return
  }

  console.log('No teams found. Proceeding with seed...')

  const teams = [
    { name: 'Titans' },
    { name: 'Raptors' },
    { name: 'Strikers' },
    { name: 'Blasters' },
    { name: 'Hawks' }
  ]

  for (const t of teams) {
    const { data: teamData, error: teamError } = await supabase.from('teams').insert({ name: t.name }).select().single()
    if (teamError) {
      console.error('Error inserting team:', teamError)
      continue
    }

    console.log(`Inserted team: ${t.name}`)

    const teamId = teamData.id
    const players = []
    
    if (t.name === 'Titans') {
      players.push('Rohit Sharma', 'Virat Kohli', 'Shubman Gill', 'KL Rahul', 'Suryakumar Yadav', 'Rishabh Pant', 'Hardik Pandya', 'Ravindra Jadeja')
    } else if (t.name === 'Raptors') {
      players.push('Jasprit Bumrah', 'Mohammed Shami', 'Mohammed Siraj', 'Kuldeep Yadav', 'Yuzvendra Chahal', 'Shardul Thakur', 'Axar Patel', 'Ravichandran Ashwin')
    } else if (t.name === 'Strikers') {
      players.push('David Warner', 'Steve Smith', 'Marnus Labuschagne', 'Glenn Maxwell', 'Travis Head', 'Cameron Green', 'Pat Cummins', 'Mitchell Starc')
    } else if (t.name === 'Blasters') {
      players.push('Kane Williamson', 'Devon Conway', 'Daryl Mitchell', 'Glenn Phillips', 'Tim Southee', 'Trent Boult', 'Kyle Jamieson', 'Mitchell Santner')
    } else if (t.name === 'Hawks') {
      players.push('Jos Buttler', 'Ben Stokes', 'Joe Root', 'Jonny Bairstow', 'Mark Wood', 'Jofra Archer', 'Moeen Ali', 'Sam Curran')
    }

    const playerInserts = players.map(p => ({ team_id: teamId, name: p }))
    const { error: playerError } = await supabase.from('players').insert(playerInserts)
    if (playerError) {
      console.error(`Error inserting players for ${t.name}:`, playerError)
    } else {
      console.log(`Inserted 8 players for ${t.name}`)
    }
  }

  console.log('Seeding complete.')
}

seed()
