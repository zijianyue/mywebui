import { WEBUI_API_BASE_URL } from '$lib/constants';
import { getUserPosition } from '$lib/utils';

export const getUserPermissions = async (token: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/permissions/user`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const updateUserPermissions = async (token: string, permissions: object) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/permissions/user`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			...permissions
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const updateUserRole = async (token: string, id: string, role: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/update/role`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			id: id,
			role: role
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const addAcountBill = async (user_id: string,
	model_id: string,
    input_tokens: string,
    output_tokens: string,
    input_cost: string,
    output_cost: string,
    amount: string,
	year: number,
	month: number) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/add/account_bill`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			id: user_id,
			model_id: model_id,
			input_tokens: input_tokens,
			output_tokens: output_tokens,
			input_cost: input_cost,
			output_cost: output_cost,
			amount: amount,
			year: year,
			month: month,
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}
	return res;
};

export const getAcountBillsByYear = async (id: string, year: number) => {
	let error = null;
	console.log(`id ${id}, year ${year}`)

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/get/account_bills_by_year`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			id: id,
			year: year,
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res ? res : [];
};

export const getAcountBillsByYearMonth = async (id: string, year: number, month: number) => {
	let error = null;
	console.log(`id ${id}, year ${year}, month ${month}`)

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/get/account_bills_by_year_month`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			id: id,
			year: year,
			month: month,
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res ? res : [];
};

export const getUsers = async (token: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res ? res : [];
};


export const getUserSettingsByUserId = async (token: string, userId: string) => {
	let error = null;
	const res = await fetch(`${WEBUI_API_BASE_URL}/users/user/${userId}/settings`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};


export const getUserSettings = async (token: string) => {
	let error = null;
	const res = await fetch(`${WEBUI_API_BASE_URL}/users/user/settings`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const updateUserSettings = async (token: string, settings: object) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/user/settings/update`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			...settings
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getUserById = async (token: string, userId: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/${userId}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getUserInfo = async (token: string) => {
	let error = null;
	const res = await fetch(`${WEBUI_API_BASE_URL}/users/user/info`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const updateUserInfo = async (token: string, info: object) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/user/info/update`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			...info
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getAndUpdateUserLocation = async (token: string) => {
	const location = await getUserPosition().catch((err) => {
		throw err;
	});

	if (location) {
		await updateUserInfo(token, { location: location });
		return location;
	} else {
		throw new Error('Failed to get user location');
	}
};

export const deleteUserById = async (token: string, userId: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/${userId}`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

type UserUpdateForm = {
	profile_image_url: string;
	cell_phone: string;
	email: string;
	name: string;
	password: string;
	amount: number;
};

export const updateUserById = async (token: string, userId: string, user: UserUpdateForm) => {
	let error = null;
	console.log('updateUserById amount:', user.amount);

	const res = await fetch(`${WEBUI_API_BASE_URL}/users/${userId}/update`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			profile_image_url: user.profile_image_url,
			email: user.email,
			cell_phone: user.cell_phone,
			name: user.name,
			password: user.password !== '' ? user.password : undefined,
			amount: user.amount
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};
