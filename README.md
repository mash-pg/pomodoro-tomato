This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

This application is a comprehensive Pomodoro timer designed to enhance productivity. It includes the following features:

### 1. Pomodoro Timer

The core of the application. It features a customizable timer for work sessions, short breaks, and long breaks.

```
+---------------------------------+
|            Pomodoro             |
|                                 |
|             25:00               |
|                                 |
|      [ START ] [ RESET ]        |
|                                 |
|   Today: 4 Pomodoros / 100 min  |
+---------------------------------+
```

### 2. Statistics Page

Track your progress with detailed statistics. Set daily, weekly, and monthly goals, and view your activity patterns in charts.

```
+---------------------------------+
|          Your Statistics        |
|                                 |
| Today:   [ 5/8 ] Pomodoros      |
| This Week: [ 25/40 ] Pomodoros   |
| This Month:[ 100/160 ] Pomodoros |
|                                 |
| [ Recent Sessions... ]          |
| [ Manual Add...    ]          |
+---------------------------------+
```

### 3. Calendar View

Review your past activity with a monthly calendar view, which shows the number of Pomodoros completed each day.

```
+---------------------------------+
|        Pomodoro Calendar        |
|                                 |
|      <   August 2025   >        |
|  Su  Mo  Tu  We  Th  Fr  Sa     |
|                  1   2 (8)      |
|   3   4   5   6   7   8   9     |
|  10  11  12 (5) 13  14  15     |
|  ...                            |
+---------------------------------+
```

### 4. Weekly Time Calendar

A responsive weekly calendar that visualizes your Pomodoro sessions by time. The layout adapts to your screen size.

**PC View:**
On larger screens, the calendar displays a full week with vertical timelines for each day, allowing for a detailed overview of your productivity.

```
+----------------------------------------------------------------------------------------------------+
|                                       Weekly Pomodoro (Time)                                       |
+----------------------------------------------------------------------------------------------------+
| < Previous Week                      YYYY-MM-DD - YYYY-MM-DD                       Next Week >     |
+----------------------------------------------------------------------------------------------------+
|      Sun          Mon          Tue          Wed          Thu          Fri          Sat             |
|    MM/DD        MM/DD        MM/DD        MM/DD        MM/DD        MM/DD        MM/DD           |
|     8.5h         7.0h         9.2h         6.5h         8.0h         5.5h         10.0h          |
|  +--------+   +--------+   +--------+   +--------+   +--------+   +--------+   +--------+        |
|  |   ||   |   | ||     |   |   |||  |   |  ||    |   | ||||   |   |   ||   |   |  ||||| |        |
|  |   ||   |   | ||     |   |   |||  |   |  ||    |   | ||||   |   |   ||   |   |  ||||| |        |
|  |   ||   |   | ||     |   |   |||  |   |  ||    |   | ||||   |   |   ||   |   |  ||||| |        |
|  +--------+   +--------+   +--------+   +--------+   +--------+   +--------+   +--------+        |
+----------------------------------------------------------------------------------------------------+
```

**Mobile View:**
On smaller screens, the layout adapts to a vertical list, with each day displaying a horizontal timeline for clear readability.

```
+---------------------------------+
|      Weekly Pomodoro (Time)     |
+---------------------------------+
| < Prev Week       Next Week >   |
|      YYYY-MM-DD - YYYY-MM-DD      |
+---------------------------------+
| Sun MM/DD 8.5h [=====-----]     |
+---------------------------------+
| Mon MM/DD 7.0h [====------]     |
+---------------------------------+
| Tue MM/DD 9.2h [======----]     |
+---------------------------------+
| ...                             |
+---------------------------------+
```

### 5. User Authentication & Settings

Sign up and log in to sync your data across devices. You can customize timer durations, auto-start behavior, and theme settings.

```
+---------------------------------+
|             Settings            |
|                                 |
| Work Duration:     [ 25 ] min   |
| Short Break:       [ 5  ] min   |
| Long Break:        [ 15 ] min   |
|                                 |
| Auto-start Break:  [ On/Off ]   |
| Theme:             [ Dark/Light ] |
|                                 |
|            [ Save ]             |
+---------------------------------+
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
